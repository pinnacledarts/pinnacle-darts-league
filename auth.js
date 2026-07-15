const SUPABASE_URL = 'https://xcygwejfphziercarakq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeWd3ZWpmcGh6aWVyY2FyYWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDQwNDIsImV4cCI6MjA5ODQyMDA0Mn0.9FZ_OlIohNt0c-5cq4YI9pS1I1V2HvrggXtvZIXfr6U';
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
(function() {
  var style = document.createElement('style');
  style.textContent = 'main { max-width: 1200px !important; }';
  document.head.appendChild(style);
})();
(function() {
  var link = document.createElement('link');
  link.rel = 'icon';
  link.href = 'logo.png';
  document.head.appendChild(link);
})();
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.createElement('button');
  btn.textContent = '🐛 Report a Bug';
  btn.style.cssText = 'position:fixed;bottom:16px;right:16px;background-color:#111111;color:#ffffff;border:none;padding:10px 18px;border-radius:24px;font-size:0.85em;cursor:pointer;font-family:Arial, sans-serif;z-index:999;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
  btn.onclick = openBugReportModal;
  document.body.appendChild(btn);

  var overlay = document.createElement('div');
  overlay.id = 'bugReportOverlay';
  overlay.style.cssText = 'display:none;position:fixed;inset:0;background-color:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML =
    '<div style="background-color:#ffffff;border-radius:8px;padding:24px;max-width:400px;width:100%;">' +
    '<h3 style="margin:0 0 16px;">Report a Bug</h3>' +
    '<div id="bugReportSuccess" style="display:none;background:#f0fff0;border:1px solid #cceecc;color:#006600;padding:10px;border-radius:4px;margin-bottom:16px;font-size:0.9em;">Thanks! Your report has been sent.</div>' +
    '<textarea id="bugReportText" rows="5" placeholder="Describe what went wrong..." style="width:100%;padding:10px;border:1px solid #dddddd;border-radius:4px;font-family:Arial, sans-serif;font-size:1em;box-sizing:border-box;"></textarea>' +
    '<div style="margin-top:16px;display:flex;gap:8px;">' +
    '<button onclick="submitBugReport()" style="background-color:#111111;color:#ffffff;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;">Send</button>' +
    '<button onclick="closeBugReportModal()" style="background:none;border:1px solid #dddddd;padding:10px 20px;border-radius:4px;cursor:pointer;">Cancel</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
});

function openBugReportModal() {
  document.getElementById('bugReportOverlay').style.display = 'flex';
  document.getElementById('bugReportSuccess').style.display = 'none';
  document.getElementById('bugReportText').value = '';
}

function closeBugReportModal() {
  document.getElementById('bugReportOverlay').style.display = 'none';
}

async function submitBugReport() {
  var description = document.getElementById('bugReportText').value.trim();
  if (!description) { alert('Please describe the issue before sending.'); return; }

  var reporterId = null;
  var reporterEmail = null;
  const { data: { session } } = await sbClient.auth.getSession();
  if (session) {
    reporterId = session.user.id;
    reporterEmail = session.user.email;
  }

  const { error } = await sbClient.from('bug_reports').insert([{
    reporter_id: reporterId,
    reporter_email: reporterEmail,
    page_url: window.location.href,
    description: description
  }]);

  if (error) {
    alert('Error sending report. Please try again.');
    return;
  }

  document.getElementById('bugReportSuccess').style.display = 'block';
  document.getElementById('bugReportText').value = '';
}
document.addEventListener('DOMContentLoaded', function() {
  var headerH1 = document.querySelector('header h1');
  var headerP = document.querySelector('header p');
  if (headerH1 && headerH1.textContent.trim() === 'Pinnacle Darts League') {
    headerH1.textContent = 'Pinnacle Darts Online';
    if (headerP) { headerP.style.display = 'none'; }
  }
});
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
async function checkAcademyAccess() {
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) { return false; }

  const { data: profile } = await sbClient.from('profiles').select('access').eq('id', session.user.id).single();
  if (!profile) { return false; }

  return profile.access === 'academy' || profile.access === 'both';
}

async function updateSwitchButtonVisibility() {
  const switchBtn = document.getElementById('switchBtn');
  if (!switchBtn) { return; }

  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) { switchBtn.style.display = 'none'; return; }

  const { data: profile } = await sbClient.from('profiles').select('access').eq('id', session.user.id).single();
  const hasAcademyAccess = profile && (profile.access === 'academy' || profile.access === 'both');

  if (window.location.pathname.includes('academy') || window.location.pathname.includes('admin')) {
    switchBtn.style.display = '';
  } else {
    switchBtn.style.display = hasAcademyAccess ? '' : 'none';
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
