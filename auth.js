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
      .select('username, is_admin')
      .eq('id', session.user.id)
      .single();

    const username = profile ? profile.username : session.user.email;

    authButtons.innerHTML = `
      <span class="btn-username">Logged in as ${username}</span>
      <button class="btn-logout" onclick="handleLogout()">Logout</button>
    `;

if (profile && profile.is_admin) {
  const nav = document.getElementById('mainNav');
  if (nav && !document.getElementById('adminNavLink')) {
    const adminLink = document.createElement('a');
    adminLink.href = 'admin.html';
    adminLink.id = 'adminNavLink';
    adminLink.textContent = 'Admin';
    nav.appendChild(adminLink);
  }

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
