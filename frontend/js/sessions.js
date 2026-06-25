/* ─── Sessions Module ──────────────────────────────────────────────────────── */

const Sessions = {
  _sessions: [],
  _attendanceStats: {},
  _editId: null,

  async load() {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        Api.get('/sessions'),
        Api.get('/stats')
      ]);
      this._sessions = sessionsRes.data;
      (statsRes.data.sessionStats || []).forEach(s => {
        this._attendanceStats[s.sessionId] = s;
      });
      this.populateMonthFilter();
      this.render();
    } catch (err) {
      console.error('Sessions load error:', err);
      Toast.error('Không thể tải danh sách buổi sinh hoạt');
    }
  },

  populateMonthFilter() {
    const select = document.getElementById('sessionMonthFilter');
    const current = select.value;
    const months = new Set();
    this._sessions.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        if (!isNaN(d)) months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    const sorted = [...months].sort((a, b) => b.localeCompare(a));
    select.innerHTML = '<option value="">Tất cả tháng</option>' +
      sorted.map(m => {
        const [y, mo] = m.split('-');
        return `<option value="${m}" ${m === current ? 'selected' : ''}>Tháng ${parseInt(mo)}/${y}</option>`;
      }).join('');
  },

  render() {
    const list = document.getElementById('sessionsList');
    const monthFilter = document.getElementById('sessionMonthFilter').value;

    let sessions = [...this._sessions];
    if (monthFilter) {
      sessions = sessions.filter(s => {
        if (!s.date) return false;
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === monthFilter;
      });
    }

    if (!sessions.length) {
      list.innerHTML = `
        <div class="empty-page-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3>Chưa có buổi sinh hoạt nào</h3>
          <p>Nhấn "Thêm buổi sinh hoạt" để tạo buổi sinh hoạt đầu tiên</p>
        </div>
      `;
      return;
    }

    list.innerHTML = sessions.map(s => this.renderCard(s)).join('');

    list.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.openEdit(btn.dataset.edit));
    });
    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => this.delete(btn.dataset.delete));
    });
    list.querySelectorAll('[data-attend]').forEach(btn => {
      btn.addEventListener('click', () => {
        App.navigate('attendance');
        setTimeout(() => Attendance.selectSession(btn.dataset.attend), 200);
      });
    });
    list.querySelectorAll('[data-export-session]').forEach(btn => {
      btn.addEventListener('click', () => this.exportSession(btn.dataset.exportSession));
    });
  },

  renderCard(session) {
    const stats = this._attendanceStats[session.id] || { present: 0, absent: 0, total: 0, rate: 0 };
    const day = getDayOfMonth(session.date);
    const month = getMonthLabel(session.date);

    return `
      <div class="session-card">
        <div class="session-date-badge">
          <div class="session-date-day">${day}</div>
          <div class="session-date-month">${month}</div>
        </div>
        <div class="session-info">
          <div class="session-name">${session.name}</div>
          <div class="session-topic">${session.topic || 'Chưa có chủ đề'} · ${formatDate(session.date)}</div>
        </div>
        <div class="session-stats">
          <div class="session-stat">
            <div class="session-stat-value" style="color: var(--green-light)">${stats.present}</div>
            <div class="session-stat-label">Có mặt</div>
          </div>
          <div class="session-stat">
            <div class="session-stat-value" style="color: var(--red-light)">${stats.absent}</div>
            <div class="session-stat-label">Vắng</div>
          </div>
          <div class="session-stat">
            ${getRateBadge(stats.rate)}
            <div class="session-stat-label">Tỉ lệ</div>
          </div>
        </div>
        <div class="session-card-actions">
          <button class="btn btn-sm btn-primary" data-attend="${session.id}" title="Điểm danh">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost" data-export-session="${session.id}" title="Xuất điểm danh" style="color:var(--green-light)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost" data-edit="${session.id}" title="Sửa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost" data-delete="${session.id}" title="Xóa" style="color:var(--red-light)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  exportSession(sessionId) {
    window.open(`/api/export/session/${sessionId}?t=${Date.now()}`, '_blank');
    Toast.info('Đang xuất điểm danh buổi sinh hoạt...');
  },

  openAdd() {
    this._editId = null;
    document.getElementById('sessionModalTitle').textContent = 'Thêm buổi sinh hoạt mới';
    document.getElementById('sessionFormId').value = '';
    document.getElementById('sessionFormName').value = '';
    document.getElementById('sessionFormDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sessionFormTopic').value = '';
    openModal('sessionModal');
  },

  openEdit(id) {
    this._editId = id;
    const session = this._sessions.find(s => s.id === id);
    if (!session) return;
    document.getElementById('sessionModalTitle').textContent = 'Chỉnh sửa buổi sinh hoạt';
    document.getElementById('sessionFormId').value = session.id;
    document.getElementById('sessionFormName').value = session.name;
    document.getElementById('sessionFormDate').value = session.date;
    document.getElementById('sessionFormTopic').value = session.topic || '';
    openModal('sessionModal');
  },

  async save() {
    const name = document.getElementById('sessionFormName').value.trim();
    const date = document.getElementById('sessionFormDate').value;
    if (!name || !date) { Toast.error('Vui lòng nhập đủ tên và ngày'); return; }

    const data = { name, date, topic: document.getElementById('sessionFormTopic').value.trim() };
    const btn = document.getElementById('saveSessionBtn');

    try {
      btn.disabled = true; btn.textContent = 'Đang lưu...';
      if (this._editId) {
        await Api.put(`/sessions/${this._editId}`, data);
        Toast.success('Đã cập nhật buổi sinh hoạt');
      } else {
        await Api.post('/sessions', data);
        Toast.success('Đã thêm buổi sinh hoạt mới');
      }
      closeModal('sessionModal');
      await this.load();
      Attendance.loadSessions();
    } catch (err) {
      Toast.error('Lỗi: ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Lưu buổi sinh hoạt';
    }
  },

  async delete(id) {
    const session = this._sessions.find(s => s.id === id);
    const confirmed = await Confirm.show(`Xóa buổi sinh hoạt "${session?.name}"? Dữ liệu điểm danh liên quan cũng sẽ bị xóa.`, 'Xóa buổi sinh hoạt');
    if (!confirmed) return;
    try {
      await Api.delete(`/sessions/${id}`);
      Toast.success('Đã xóa buổi sinh hoạt');
      await this.load();
      Attendance.loadSessions();
    } catch (err) {
      Toast.error('Không thể xóa: ' + err.message);
    }
  },

  getSessions() { return this._sessions; }
};

// ── Event bindings
document.getElementById('addSessionBtn').addEventListener('click', () => Sessions.openAdd());
document.getElementById('cancelSessionModal').addEventListener('click', () => closeModal('sessionModal'));
document.getElementById('saveSessionBtn').addEventListener('click', () => Sessions.save());
document.getElementById('sessionMonthFilter').addEventListener('change', () => Sessions.render());
