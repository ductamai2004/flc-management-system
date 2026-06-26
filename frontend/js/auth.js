const Auth = {
  admin: null,

  setAdmin(account) {
    this.admin = account || null;
    const nameEl = document.getElementById('topbarAdminName');
    if (nameEl) nameEl.textContent = this.admin ? this.admin.name : 'Admin';
  },

  async init(onAuthenticated) {
    this.bindEvents(onAuthenticated);
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Unauthenticated');
      const json = await res.json();
      this.setAdmin(json.data);
      this.showApp();
      await onAuthenticated();
    } catch (err) {
      this.showLogin();
    }
  },

  bindEvents(onAuthenticated) {
    const form = document.getElementById('loginForm');
    if (form && !form.dataset.bound) {
      form.dataset.bound = 'true';
      form.addEventListener('submit', (event) => this.login(event, onAuthenticated));
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = 'true';
      logoutBtn.addEventListener('click', () => this.logout());
    }
  },

  showLogin() {
    document.body.classList.remove('auth-pending', 'authenticated');
    document.body.classList.add('login-active');
    setTimeout(() => document.getElementById('loginUsername')?.focus(), 0);
  },

  showApp() {
    document.body.classList.remove('auth-pending', 'login-active');
    document.body.classList.add('authenticated');
  },

  async login(event, onAuthenticated) {
    event.preventDefault();
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng nhập...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Đăng nhập thất bại');

      this.setAdmin(json.data);
      passwordInput.value = '';
      this.showApp();
      await onAuthenticated();
      if (typeof Toast !== 'undefined') Toast.success('Đăng nhập thành công');
    } catch (err) {
      errorEl.textContent = err.message || 'Đăng nhập thất bại';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng nhập';
    }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    this.setAdmin(null);
    this.showLogin();
    if (typeof Toast !== 'undefined') Toast.info('Đã đăng xuất');
  }
};
