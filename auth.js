const SUPABASE_URL = 'https://xcygwejfphziercarakq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeWd3ZWpmcGh6aWVyY2FyYWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDQwNDIsImV4cCI6MjA5ODQyMDA0Mn0.9FZ_OlIohNt0c-5cq4YI9pS1I1V2HvrggXtvZIXfr6U';
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAuth() {
  const { data: { session } } = await sbClient.auth.getSession();

  const authButtons = document.getElementById('authButtons');
  if (!authButtons) return;

  if (session) {
    const { data: profile } = await sbClient
      .from('profiles')
      .select('username, is_admin, requested_access, access_status')
      .eq('id', session.user.id)
      .single();

    if (profile && profile.requested_access === 'academy' && profile.access_status !== 'approved' && !window.location.pathname.includes('membership-status.html')) {
      window.location.href = profile.access_status === 'denied' ? 'membership-status.html?status=denied' : 'membership-status.html?status=pending';
      return;
    }

    const username = profile ? profile.username : session.user.email;

    authButtons.innerHTML = `
      <span class="btn-username">Logged in as ${username}</span>
      <button class="btn-logout" onclick="handleLogout()">Logout</button>
    `;

    if (profile && profile.is_admin) {
      const switchBtn = document.querySelector('.btn-switch');
      if (switchBtn && !document.getElementById('adminHeaderLink')) {
        const adminHeaderLink = document.createElement('a');
        adminHeaderLink.href = 'admin.html';
        adminHeaderLink.id = 'adminHeaderLink';
        adminHeaderLink.className = 'btn-switch';
        adminHeaderLink.textContent = 'Admin';
        switchBtn.insertAdjacentElement('afterend', adminHeaderLink);
      }
    }

  } else {
    authButtons.innerHTML = `
      <a href="login.html" class="btn-login">Login / Register</a>
    `;
  }
}

async function handleLogout() {
  await sbClient.auth.signOut();
  window.location.href = 'index.html';
}

function isPastStartDateTime(dateStr, timeStr) {
  if (!dateStr) return true;
  var dt = new Date(dateStr + 'T' + (timeStr || '00:00'));
  return new Date() >= dt;
}

async function computeTournamentStatus(tournament) {
  var finalResult = await sbClient
    .from('tournament_matches')
    .select('status, bracket_type')
    .eq('tournament_id', tournament.id)
    .eq('stage', 'knockout')
    .eq('round', 'Final');

  var mainFinal = (finalResult.data || []).find(function(m) {
    return (m.bracket_type || 'A') === 'A';
  });

  if (mainFinal && mainFinal.status === 'completed') {
    return 'completed';
  }

  if (isPastStartDateTime(tournament.date, tournament.time)) {
    return 'live';
  }

  return 'upcoming';
}

async function computeLeagueStatus(league) {
  var regularResult = await sbClient
    .from('league_matches')
    .select('status')
    .eq('league_id', league.id)
    .eq('stage', 'regular');

  var regularMatches = regularResult.data || [];
  var regularComplete = regularMatches.length > 0 && regularMatches.every(function(m) {
    return m.status === 'completed';
  });

  var isComplete = false;

  if (league.playoffs) {
    var playoffResult = await sbClient
      .from('league_matches')
      .select('status, round')
      .eq('league_id', league.id)
      .eq('stage', 'playoff')
      .eq('round', 'Final');

    var finalMatch = (playoffResult.data || [])[0];
    isComplete = regularComplete && finalMatch && finalMatch.status === 'completed';
  } else {
    isComplete = regularComplete;
  }

  if (isComplete) {
    return 'completed';
  }

  if (isPastStartDateTime(league.start_date, null)) {
    return 'live';
  }

  return 'upcoming';
}

function getStatusBadgeHtml(status) {
  var labels = { upcoming: 'Upcoming', live: 'Live', completed: 'Completed' };
  return '<span class="badge badge-status-' + status + '">' + (labels[status] || status) + '</span>';
}
async function updatePlayerAverage(playerId) {
  var leagueResult = await sbClient.from('league_matches').select('player1_id, player2_id, player1_avg, player2_avg').or('player1_id.eq.' + playerId + ',player2_id.eq.' + playerId);
  var tournamentResult = await sbClient.from('tournament_matches').select('player1_id, player2_id, player1_avg, player2_avg').or('player1_id.eq.' + playerId + ',player2_id.eq.' + playerId);

  var avgs = [];
  (leagueResult.data || []).forEach(function(m) {
    if (m.player1_id === playerId && m.player1_avg != null) { avgs.push(parseFloat(m.player1_avg)); }
    if (m.player2_id === playerId && m.player2_avg != null) { avgs.push(parseFloat(m.player2_avg)); }
  });
  (tournamentResult.data || []).forEach(function(m) {
    if (m.player1_id === playerId && m.player1_avg != null) { avgs.push(parseFloat(m.player1_avg)); }
    if (m.player2_id === playerId && m.player2_avg != null) { avgs.push(parseFloat(m.player2_avg)); }
  });

  if (avgs.length > 0) {
    var mean = avgs.reduce(function(a, b) { return a + b; }, 0) / avgs.length;
    await sbClient.from('profiles').update({ average: mean.toFixed(2) }).eq('id', playerId);
  }
}
