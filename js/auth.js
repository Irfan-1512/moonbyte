// Optional login with Supabase. Moonbyte works fine without logging in.
let sb = null;
let signedIn = false;
let authMode = 'login';

try {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (err) {
  console.log('Supabase is not set up. Check js/config.js', err);
}

function showAuth(show, note = '') {
  document.getElementById('auth-screen').style.display = show ? 'flex' : 'none';
  document.body.classList.toggle('auth-open', show);
  document.getElementById('auth-note').textContent = show ? note : '';
  if (show) document.getElementById('auth-email').focus();
}

// Turns Supabase's technical messages into something you can act on
function friendlyAuthError(err) {
  const msg = String((err && err.message) || '');
  if ((err && err.status === 429) || /rate limit/i.test(msg)) {
    return 'Too many emails were sent. Wait a while, or turn off "Confirm email" in Supabase.';
  }
  if (/not confirmed/i.test(msg)) return 'Please confirm your email first (check your inbox).';
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/already registered/i.test(msg)) return 'That email already has an account. Try logging in.';
  if (/invalid api key|apikey/i.test(msg)) return 'The Supabase key in js/config.js looks wrong.';
  if (/failed to fetch|network/i.test(msg)) return 'Could not reach Supabase. Check your internet and js/config.js.';
  return msg || 'Something went wrong. Try again.';
}

function setAuthError(msg) {
  document.getElementById('auth-error').textContent = msg;
}

function toggleAuthMode(e) {
  e.preventDefault();
  authMode = authMode === 'login' ? 'signup' : 'login';
  const signup = authMode === 'signup';
  document.getElementById('auth-title').textContent = signup ? 'Create account' : 'Log in';
  document.getElementById('auth-submit').textContent = signup ? 'Create account' : 'Log in';
  document.getElementById('auth-switch-text').textContent = signup ? 'Already have an account?' : 'New here?';
  document.getElementById('auth-switch-link').textContent = signup ? 'Log in' : 'Create an account';
  document.getElementById('auth-password').autocomplete = signup ? 'new-password' : 'current-password';
  setAuthError('');
}

async function submitAuth() {
  if (!sb) return setAuthError('Login is not set up yet.');
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  const btn = document.getElementById('auth-submit');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setAuthError('Enter a valid email address');
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
    return setAuthError('Password must be 8 to 72 characters');
  }

  btn.disabled = true;
  setAuthError('');
  try {
    if (authMode === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) setAuthError('Check your email to confirm your account, then log in.');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    console.log('Auth error', err);
    setAuthError(friendlyAuthError(err));
  } finally {
    btn.disabled = false;
  }
}

async function logout() {
  if (!sb) return;
  await sb.auth.signOut();
  if (typeof resetChatView === 'function') resetChatView();
}

function accountClick() {
  if (signedIn) logout();
  else showAuth(true);
}

['auth-email', 'auth-password'].forEach((id) => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAuth();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') showAuth(false);
});

// Fires on page load and on every login/logout.
if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    signedIn = Boolean(session);
    if (signedIn) showAuth(false);
    const btn = document.getElementById('account-btn');
    const label = signedIn ? 'Log out' : 'Log in';
    btn.textContent = signedIn ? '🚪' : '🔐';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    if (typeof syncAuthChanged === 'function') syncAuthChanged(session);
  });
}