/* ─── Reports Module ───────────────────────────────────────────────────────── */

const Reports = {
  _stats: null,

  async load() {
    try {
      const res = await Api.get('/stats');
      this._stats = res.data;
      this.render();
    } catch (err) {
      console.error('Reports load error:', err);
      Toast.error('Không thể tải dữ liệu báo cáo');
    }
  },

  render() {
    const s = this._stats;
    const container = document.getElementById('reportsGrid');
    if (!s) return;

    container.innerHTML = `
      <!-- By Member -->
      <div class="report-card">
        <div class="card-header">
          <h3 class="card-title">Điểm danh theo thành viên</h3>
          <span class="badge badge--gray">${s.memberStats.length} người</span>
        </div>
        <div class="table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Họ và Tên</th>
                <th>Có mặt</th>
                <th>Vắng</th>
                <th>Tỉ lệ</th>
              </tr>
            </thead>
            <tbody>
              ${s.memberStats.length ? s.memberStats.map((m, i) => {
                const cls = getRateClass(m.rate);
                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td style="font-weight:600; color: var(--text-primary)">${m.name}</td>
                    <td><span style="color: var(--green-light); font-weight: 600">${m.present}</span></td>
                    <td><span style="color: var(--red-light); font-weight: 600">${m.absent}</span></td>
                    <td>
                      <div class="inline-rate">
                        <div class="inline-rate-bar">
                          <div class="inline-rate-fill fill--${cls}" style="width:${m.rate}%"></div>
                        </div>
                        <span style="font-weight:600; color: var(--text-primary); min-width:36px">${m.rate}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="5" class="empty-state">Chưa có dữ liệu</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- By Session -->
      <div class="report-card">
        <div class="card-header">
          <h3 class="card-title">Thống kê theo buổi sinh hoạt</h3>
          <span class="badge badge--gray">${s.sessionStats.length} buổi</span>
        </div>
        <div class="table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>Buổi sinh hoạt</th>
                <th>Ngày</th>
                <th>Có mặt</th>
                <th>Vắng</th>
                <th>Tỉ lệ</th>
              </tr>
            </thead>
            <tbody>
              ${s.sessionStats.length ? s.sessionStats.map(session => {
                const cls = getRateClass(session.rate);
                return `
                  <tr>
                    <td style="font-weight:600; color: var(--text-primary)">${session.name}</td>
                    <td>${formatDate(session.date)}</td>
                    <td><span style="color: var(--green-light); font-weight: 600">${session.present}</span></td>
                    <td><span style="color: var(--red-light); font-weight: 600">${session.absent}</span></td>
                    <td>
                      <div class="inline-rate">
                        <div class="inline-rate-bar">
                          <div class="inline-rate-fill fill--${cls}" style="width:${session.rate}%"></div>
                        </div>
                        <span style="font-weight:600; color: var(--text-primary); min-width:36px">${session.rate}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="5" class="empty-state">Chưa có dữ liệu</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="report-card" style="grid-column: 1 / -1;">
        <div class="card-header">
          <h3 class="card-title">Tổng kết</h3>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; padding: 0;">
          ${[
            { label: 'Tổng thành viên', value: s.totalMembers, color: 'var(--purple-light)', icon: '👥' },
            { label: 'Tổng buổi sinh hoạt', value: s.totalSessions, color: 'var(--blue-light)', icon: '📅' },
            { label: 'Tỉ lệ chuyên cần', value: s.overallRate + '%', color: 'var(--green-light)', icon: '📊' }
          ].map(item => `
            <div style="padding: 24px; text-align: center; border-right: 1px solid var(--border);">
              <div style="font-size: 32px; margin-bottom: 8px;">${item.icon}</div>
              <div style="font-size: 28px; font-weight: 800; color: ${item.color}; letter-spacing: -0.02em">${item.value}</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px">${item.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};

// Export button on reports page
document.getElementById('exportReportBtn').addEventListener('click', () => {
  window.open(`/api/export?type=reports&t=${Date.now()}`, '_blank');
  Toast.info('Đang tải xuống file báo cáo tổng hợp...');
});
