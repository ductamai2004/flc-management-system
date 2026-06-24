/* ─── Dashboard Module ─────────────────────────────────────────────────────── */

const Dashboard = {
  _stats: null,

  async load() {
    try {
      const res = await Api.get('/stats');
      this._stats = res.data;
      this.render();
    } catch (err) {
      console.error('Dashboard load error:', err);
      Toast.error('Không thể tải dữ liệu dashboard');
    }
  },

  renderWarningList(memberStats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let warnings = memberStats.filter(m => m.absent > 0).sort((a, b) => b.absent - a.absent);
    const top = warnings.slice(0, 7);

    if (!top.length) {
      container.innerHTML = '<div class="loading-placeholder" style="color: var(--green-light)">Không có thành viên nào vắng mặt</div>';
      return;
    }

    const html = top.map(m => {
      const escapedName = m.name.replace(/'/g, "\\'");
      return `
        <div class="top-list-item" style="justify-content: space-between">
          <div style="display:flex; align-items:center; gap: 10px; flex: 1; overflow: hidden;">
            <div class="top-rank" style="background: rgba(255, 75, 75, 0.1); color: var(--red-light)">
              ${m.absent}
            </div>
            <div class="top-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.name}">${m.name}</div>
          </div>
          ${m.email ? `
            <button onclick="Dashboard.sendEmail('${m.memberId}', '${escapedName}', '${m.email}', ${m.absent}, this)" class="btn btn-sm btn-outline" style="padding: 4px 8px; font-size: 11px; border-color: var(--red-light); color: var(--red-light); white-space: nowrap; flex-shrink: 0;" title="Gửi Email tự động">
              Gửi Email
            </button>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted); font-style: italic; white-space: nowrap; flex-shrink: 0;">Không có Email</span>
          `}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  },

  async sendEmail(memberId, name, email, absentCount, btnEl) {
    if (!email) return;
    const originalText = btnEl.innerText;
    btnEl.innerText = 'Đang gửi...';
    btnEl.disabled = true;
    
    try {
      const res = await Api.post('/email/send-warning', { memberId, name, email, absentCount });
      if (res.success) {
        Toast.success(`Đã gửi email nhắc nhở đến ${name}`);
        btnEl.innerText = 'Đã gửi ✓';
        btnEl.style.borderColor = 'var(--green-light)';
        btnEl.style.color = 'var(--green-light)';
      }
    } catch (err) {
      Toast.error('Lỗi khi gửi email: ' + err.message);
      btnEl.innerText = originalText;
      btnEl.disabled = false;
    }
  },

  render() {
    const s = this._stats;
    if (!s) return;

    // Animate stat cards
    const memberEl = document.getElementById('stat-members');
    const sessionEl = document.getElementById('stat-sessions');
    const rateEl = document.getElementById('stat-rate');
    const presentEl = document.getElementById('stat-present');

    if (memberEl.textContent === '—') memberEl.textContent = '0';
    if (sessionEl.textContent === '—') sessionEl.textContent = '0';
    if (rateEl.textContent === '—') rateEl.textContent = '0';
    if (presentEl.textContent === '—') presentEl.textContent = '0';

    animateCounter(memberEl, s.totalMembers);
    animateCounter(sessionEl, s.totalSessions);
    animateCounter(rateEl, s.overallRate);
    animateCounter(presentEl, s.presentTotal);

    // Update rate to show %
    setTimeout(() => { rateEl.textContent = s.overallRate + '%'; }, 820);

    // Charts
    Charts.renderSessionChart(s.sessionStats, 'sessionChart');
    Charts.renderTopList(s.memberStats, 'topAttendanceList');
    this.renderWarningList(s.memberStats, 'warningAttendanceList');

    // Member summary table
    document.getElementById('memberCount').textContent = `${s.memberStats.length} thành viên`;
    const tbody = document.getElementById('memberSummaryBody');
    if (!s.memberStats.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Chưa có dữ liệu</td></tr>';
      return;
    }

    tbody.innerHTML = s.memberStats.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="att-table-name">${m.name}</td>
        <td><span style="color: var(--green-light); font-weight: 600;">${m.present}</span></td>
        <td><span style="color: var(--red-light); font-weight: 600;">${m.absent}</span></td>
        <td>${m.total}</td>
        <td>${getRateBadge(m.rate)}</td>
      </tr>
    `).join('');
  }
};
