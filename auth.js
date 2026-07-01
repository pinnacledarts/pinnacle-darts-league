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
      .select('username')
      .eq('id', session.user.id)
      .single();

    const username = profile ? profile.username : session.user.email;

    authButtons.innerHTML = `
      <span class="btn-username">Logged in as ${username}</span>
      <button class="btn-logout" onclick="handleLogout()">Logout</button>
    `;
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