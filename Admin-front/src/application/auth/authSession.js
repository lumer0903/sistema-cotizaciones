const AUTH_KEY = 'goldcontinent_auth';

export const authSession = {
  get() { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; } },
  save(session) { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); },
  user() { return this.get()?.usuario || null; },
  token() { return this.get()?.token || null; },
  logout() { localStorage.removeItem(AUTH_KEY); window.location.assign('/login'); }
};
