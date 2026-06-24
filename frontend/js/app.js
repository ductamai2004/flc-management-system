/* ─── App Main Controller ───────────────────────────────────────────────────── */

const App = {
  _currentPage: 'dashboard',

  init() {
    // Set current date in topbar
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('vi-VN', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(item.dataset.page);
      });
    });

    // Mobile sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('mobile-open');
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      const menuToggle = document.getElementById('menuToggle');
      if (sidebar.classList.contains('mobile-open') &&
          !sidebar.contains(e.target) &&
          !menuToggle.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    });

    // Global export button (top bar)
    document.getElementById('exportBtn').addEventListener('click', () => {
      const page = App._currentPage;
      let type = 'attendance';
      if (page === 'members') type = 'members';
      else if (page === 'sessions') type = 'sessions';

      window.open(`/api/export?type=${type}&t=${Date.now()}`, '_blank');
      Toast.info('Đang xuất file Excel...');
    });

    // Load initial page
    this.navigate('dashboard');
  },

  navigate(page) {
    this._currentPage = page;

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });

    // Update topbar title
    const titles = {
      dashboard: 'Dashboard',
      attendance: 'Điểm danh',
      members: 'Thành viên',
      sessions: 'Buổi học',
      reports: 'Báo cáo'
    };
    document.getElementById('topbarTitle').textContent = titles[page] || page;

    // Toggle export button
    const exportBtn = document.getElementById('exportBtn');
    if (page === 'reports') {
      exportBtn.style.display = 'none';
    } else {
      exportBtn.style.display = 'flex';
    }

    // Load page data
    this.loadPage(page);

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('mobile-open');
  },

  async loadPage(page) {
    switch (page) {
      case 'dashboard':
        await Dashboard.load();
        break;
      case 'attendance':
        await Attendance.load();
        break;
      case 'members':
        await Members.load();
        break;
      case 'sessions':
        await Sessions.load();
        break;
      case 'reports':
        await Reports.load();
        break;
    }
  }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
