/* ─── Charts Module ────────────────────────────────────────────────────────── */

const Charts = {
  renderSessionChart(stats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!stats || stats.length === 0) {
      container.innerHTML = '<div class="chart-loading">Chưa có dữ liệu buổi sinh hoạt</div>';
      return;
    }

    const html = `
      <div class="bar-chart">
        ${stats.map(s => {
          const totalPossible = s.total || 1;
          const presentPct = Math.round((s.present / totalPossible) * 100);
          const absentPct = Math.round((s.absent / totalPossible) * 100);
          return `
            <div class="bar-item">
              <div class="bar-label" title="${s.name}">${s.name}</div>
              <div class="bar-track">
                <div class="bar-fill-inner">
                  <div class="bar-seg-present" style="width: 0%" data-target="${presentPct}%"></div>
                  <div class="bar-seg-absent" style="width: 0%" data-target="${absentPct}%"></div>
                </div>
              </div>
              <div class="bar-value">${s.present}/${s.total}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;

    // Animate bars after a brief delay
    requestAnimationFrame(() => {
      container.querySelectorAll('.bar-seg-present, .bar-seg-absent').forEach(seg => {
        const target = seg.getAttribute('data-target');
        setTimeout(() => { seg.style.width = target; }, 100);
      });
    });
  },

  renderTopList(memberStats, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const top = memberStats.slice(0, 7);
    if (!top.length) {
      container.innerHTML = '<div class="loading-placeholder">Chưa có dữ liệu</div>';
      return;
    }

    const html = top.map((m, i) => {
      const rankClass = i === 0 ? 'top-rank--1' : i === 1 ? 'top-rank--2' : i === 2 ? 'top-rank--3' : 'top-rank--other';
      const rateClass = getRateClass(m.rate);
      return `
        <div class="top-list-item">
          <div class="top-rank ${rankClass}">${i + 1}</div>
          <div class="top-name">${m.name}</div>
          <div class="top-rate">${m.rate}%</div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }
};
