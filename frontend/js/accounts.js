const Accounts = (() => {
  let _accounts = [];
  let _bound = false;

  const ROLE_LABELS = {
    admin: 'Quản trị viên',
    chairman: 'Chủ nhiệm',
    vice_chairman: 'Phó chủ nhiệm'
  };

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function roleLabel(role) {
    return ROLE_LABELS[role] || role || '-';
  }

  async function requestJson(url, options = {}) {
    const res = await fetch(url, options);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
    return json;
  }

  function init() {
    bindEvents();
    renderProfile();
    loadAccounts();
  }

  function bindEvents() {
    if (_bound) return;
    _bound = true;

    document.getElementById('profileBtn')?.addEventListener('click', () => App.navigate('accounts'));
    document.getElementById('profileForm')?.addEventListener('submit', updateProfile);
    document.getElementById('passwordForm')?.addEventListener('submit', changePassword);
    document.getElementById('addAccountBtn')?.addEventListener('click', () => openAccountModal());
    document.getElementById('saveAccountBtn')?.addEventListener('click', saveAccount);
    document.getElementById('cancelAccountBtn')?.addEventListener('click', () => closeModal('accountModal'));
    document.getElementById('closeAccountModal')?.addEventListener('click', () => closeModal('accountModal'));
  }

  function renderProfile() {
    const admin = Auth.admin || {};
    const usernameEl = document.getElementById('profileUsername');
    const nameEl = document.getElementById('profileName');
    const roleEl = document.getElementById('profileRoleText');
    if (usernameEl) usernameEl.value = admin.username || '';
    if (nameEl) nameEl.value = admin.name || '';
    if (roleEl) roleEl.textContent = `${roleLabel(admin.role)} · ${admin.active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}`;

    const isAdmin = admin.role === 'admin';
    const manager = document.getElementById('accountsManager');
    const noPermission = document.getElementById('accountsNoPermission');
    const actions = document.getElementById('accountsPageActions');
    if (manager) manager.style.display = isAdmin ? '' : 'none';
    if (noPermission) noPermission.style.display = isAdmin ? 'none' : '';
    if (actions) actions.style.display = isAdmin ? 'flex' : 'none';
  }

  async function updateProfile(event) {
    event.preventDefault();
    try {
      const name = document.getElementById('profileName').value.trim();
      const json = await requestJson('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      Auth.setAdmin(json.data);
      renderProfile();
      Toast.success('Đã cập nhật thông tin cá nhân');
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) {
      Toast.error('Mật khẩu nhập lại không khớp');
      return;
    }

    try {
      await requestJson('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      document.getElementById('passwordForm').reset();
      Toast.success('Đã đổi mật khẩu');
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async function loadAccounts() {
    renderProfile();
    if (!Auth.admin || Auth.admin.role !== 'admin') return;
    const tbody = document.getElementById('accountsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted)">Đang tải...</td></tr>';
    try {
      const json = await requestJson('/api/accounts');
      _accounts = json.data || [];
      renderAccounts();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--red-light)">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderAccounts() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;
    if (!_accounts.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted)">Chưa có tài khoản nào</td></tr>';
      return;
    }

    tbody.innerHTML = _accounts.map((account) => {
      const isSelf = Auth.admin && account.id === Auth.admin.id;
      const statusClass = account.active ? 'active' : 'inactive';
      const statusText = account.active ? 'Đang hoạt động' : 'Đã vô hiệu hóa';
      const toggleText = account.active ? 'Vô hiệu hóa' : 'Kích hoạt';
      return `<tr>
        <td style="font-weight:700">${escapeHtml(account.username)}</td>
        <td>${escapeHtml(account.name)}</td>
        <td><span class="role-pill">${escapeHtml(roleLabel(account.role))}</span></td>
        <td><span class="status-pill ${statusClass}">${statusText}</span></td>
        <td style="color:var(--text-muted)">${escapeHtml(formatDateTime(account.lastLoginAt))}</td>
        <td style="text-align:center"><div class="account-actions">
          <button class="btn btn-ghost btn-sm" onclick="Accounts.openAccountModal('${account.id}')">Sửa</button>
          <button class="btn ${account.active ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="Accounts.toggleAccount('${account.id}', ${!account.active})" ${isSelf && account.active ? 'disabled' : ''}>${toggleText}</button>
        </div></td>
      </tr>`;
    }).join('');
  }

  function openAccountModal(accountId = '') {
    const account = _accounts.find(item => item.id === accountId);
    document.getElementById('accountModalTitle').textContent = account ? 'Sửa tài khoản' : 'Thêm tài khoản';
    document.getElementById('accountId').value = account?.id || '';
    document.getElementById('accountName').value = account?.name || '';
    document.getElementById('accountUsername').value = account?.username || '';
    document.getElementById('accountRole').value = account?.role || 'vice_chairman';
    document.getElementById('accountActive').checked = account ? account.active : true;
    document.getElementById('accountPassword').value = '';
    document.getElementById('accountPasswordLabel').textContent = account ? 'Mật khẩu mới' : 'Mật khẩu';
    document.getElementById('accountPassword').placeholder = account ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự';
    openModal('accountModal');
  }

  async function saveAccount() {
    const accountId = document.getElementById('accountId').value;
    const payload = {
      name: document.getElementById('accountName').value.trim(),
      username: document.getElementById('accountUsername').value.trim(),
      role: document.getElementById('accountRole').value,
      active: document.getElementById('accountActive').checked,
      password: document.getElementById('accountPassword').value
    };

    if (!payload.name || !payload.username || (!accountId && !payload.password)) {
      Toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      await requestJson(accountId ? `/api/accounts/${accountId}` : '/api/accounts', {
        method: accountId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      closeModal('accountModal');
      Toast.success(accountId ? 'Đã cập nhật tài khoản' : 'Đã thêm tài khoản');
      await loadAccounts();
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async function toggleAccount(accountId, active) {
    const account = _accounts.find(item => item.id === accountId);
    if (!account) return;
    const action = active ? 'kích hoạt' : 'vô hiệu hóa';
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản ${account.username}?`)) return;

    try {
      await requestJson(`/api/accounts/${accountId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      Toast.success(`Đã ${action} tài khoản`);
      await loadAccounts();
    } catch (err) {
      Toast.error(err.message);
    }
  }

  return { init, loadAccounts, openAccountModal, toggleAccount };
})();
