/* ─── Attendance Module ────────────────────────────────────────────────────── */

const Attendance = {
  _sessions: [],
  _members: [],
  _attendance: [],
  _currentSessionId: null,
  _changes: {},

  async loadSessions() {
    try {
      const res = await Api.get('/sessions');
      this._sessions = res.data;
      const select = document.getElementById('attendanceSessionSelect');
      const current = select.value;
      select.innerHTML = '<option value="">-- Chọn buổi sinh hoạt --</option>' +
        this._sessions.map(s => `<option value="${s.id}" ${s.id === current ? 'selected' : ''}>${s.name} · ${formatDate(s.date)}</option>`).join('');
    } catch (err) {
      console.error('Load sessions error:', err);
    }
  },

  async load() {
    await this.loadSessions();
    try {
      const res = await Api.get('/members');
      this._members = res.data.filter(m => m.active);
    } catch (err) {
      console.error('Load members error:', err);
    }
  },

  async selectSession(sessionId) {
    if (!sessionId) {
      document.getElementById('attendanceTableCard').style.display = 'none';
      document.getElementById('attendancePlaceholder').style.display = 'flex';
      this._currentSessionId = null;
      return;
    }

    // Update the select element if called programmatically
    document.getElementById('attendanceSessionSelect').value = sessionId;

    this._currentSessionId = sessionId;
    this._changes = {};
    document.getElementById('attendanceTableCard').style.display = 'block';
    document.getElementById('attendancePlaceholder').style.display = 'none';

    try {
      const [attRes] = await Promise.all([
        Api.get(`/attendance?sessionId=${sessionId}`)
      ]);
      this._attendance = attRes.data;

      const session = this._sessions.find(s => s.id === sessionId);
      if (session) {
        document.getElementById('attendanceSessionName').textContent = session.name;
        document.getElementById('attendanceSessionDate').textContent = formatDate(session.date) + (session.topic ? ` · ${session.topic}` : '');
      }

      this.renderTable();
    } catch (err) {
      Toast.error('Không thể tải dữ liệu điểm danh');
    }
  },

  renderTable() {
    const tbody = document.getElementById('attendanceBody');
    if (!this._members.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Chưa có thành viên nào</td></tr>';
      return;
    }

    tbody.innerHTML = this._members.map((member, idx) => {
      const record = this._attendance.find(a => a.memberId === member.id);
      const status = (this._changes[member.id] !== undefined) ? this._changes[member.id] : (record?.status || 'not_recorded');
      const note = record?.note || '';
      const initials = getInitials(member.name);

      return `
        <tr data-member-id="${member.id}">
          <td>${idx + 1}</td>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="member-avatar" style="width:32px;height:32px;font-size:12px;flex-shrink:0">${initials}</div>
              <span class="att-table-name">${member.name}</span>
            </div>
          </td>
          <td>
            <div class="att-status-toggle">
              <button class="att-btn att-btn--present ${status === 'present' ? 'active' : ''}" data-member="${member.id}" data-status="present">✓ Có mặt</button>
              <button class="att-btn att-btn--absent ${status === 'absent' ? 'active' : ''}" data-member="${member.id}" data-status="absent">✗ Vắng</button>
              <button class="att-btn att-btn--nr ${status === 'not_recorded' ? 'active' : ''}" data-member="${member.id}" data-status="not_recorded">—</button>
            </div>
          </td>
          <td>
            <input type="text" class="att-note-input" data-member="${member.id}" placeholder="Ghi chú..." value="${note}" />
          </td>
        </tr>
      `;
    }).join('');

    // Bind status buttons
    tbody.querySelectorAll('.att-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberId = btn.dataset.member;
        const status = btn.dataset.status;
        this._changes[memberId] = status;

        // Update UI
        const row = tbody.querySelector(`tr[data-member-id="${memberId}"]`);
        row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.updateStats();
      });
    });

    this.updateStats();
  },

  updateStats() {
    let present = 0, absent = 0, notRecorded = 0;

    this._members.forEach(member => {
      const status = (this._changes[member.id] !== undefined)
        ? this._changes[member.id]
        : (this._attendance.find(a => a.memberId === member.id)?.status || 'not_recorded');

      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else notRecorded++;
    });

    document.getElementById('countPresent').textContent = present;
    document.getElementById('countAbsent').textContent = absent;
    document.getElementById('countNotRecorded').textContent = notRecorded;

    const total = present + absent;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    document.getElementById('attProgressFill').style.width = rate + '%';
    document.getElementById('attRate').textContent = rate + '%';
  },

  getNotesFromDOM() {
    const notes = {};
    document.querySelectorAll('.att-note-input').forEach(input => {
      notes[input.dataset.member] = input.value.trim();
    });
    return notes;
  },

  async save() {
    if (!this._currentSessionId) return;

    const notes = this.getNotesFromDOM();
    const records = this._members.map(member => {
      const record = this._attendance.find(a => a.memberId === member.id);
      const status = (this._changes[member.id] !== undefined)
        ? this._changes[member.id]
        : (record?.status || 'not_recorded');

      return { memberId: member.id, status, note: notes[member.id] || '' };
    });

    const btn = document.getElementById('saveAttendance');
    btn.disabled = true;
    btn.innerHTML = `<span>Đang lưu...</span>`;

    try {
      await Api.post('/attendance/bulk', {
        sessionId: this._currentSessionId,
        records
      });

      this._changes = {};
      Toast.success('Đã lưu điểm danh thành công!');
      // Reload to get fresh data
      const attRes = await Api.get(`/attendance?sessionId=${this._currentSessionId}`);
      this._attendance = attRes.data;
    } catch (err) {
      Toast.error('Lỗi khi lưu: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Lưu điểm danh
      `;
    }
  },

  markAll(status) {
    this._members.forEach(m => { this._changes[m.id] = status; });

    const tbody = document.getElementById('attendanceBody');
    this._members.forEach(member => {
      const row = tbody.querySelector(`tr[data-member-id="${member.id}"]`);
      if (!row) return;
      row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
      const target = row.querySelector(`.att-btn[data-status="${status}"]`);
      if (target) target.classList.add('active');
    });

    this.updateStats();
  },

  _qrScanner: null,

  openQrScanner() {
    if (!this._currentSessionId) {
      Toast.error('Vui lòng chọn buổi sinh hoạt trước khi quét QR');
      return;
    }
    openModal('qrScannerModal');
    document.getElementById('qrScanResult').style.display = 'none';

    const html5QrCode = new Html5Qrcode('qr-reader');
    this._qrScanner = html5QrCode;

    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => { this.handleQrScan(decodedText); },
      () => {}
    ).catch(err => {
      Toast.error('Không thể mở camera: ' + err);
    });
  },

  closeQrScanner() {
    if (this._qrScanner) {
      this._qrScanner.stop().catch(() => {});
      this._qrScanner = null;
    }
    closeModal('qrScannerModal');
  },

  handleQrScan(memberId) {
    const member = this._members.find(m => m.id === memberId);
    const resultEl = document.getElementById('qrScanResult');

    if (!member) {
      resultEl.style.display = 'block';
      resultEl.style.background = 'rgba(255,75,75,0.15)';
      resultEl.style.color = 'var(--red-light)';
      resultEl.textContent = '❌ Không tìm thấy thành viên';
      return;
    }

    // Mark as present
    this._changes[member.id] = 'present';
    const tbody = document.getElementById('attendanceBody');
    const row = tbody.querySelector(`tr[data-member-id="${member.id}"]`);
    if (row) {
      row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
      const target = row.querySelector('.att-btn[data-status="present"]');
      if (target) target.classList.add('active');
    }
    this.updateStats();

    resultEl.style.display = 'block';
    resultEl.style.background = 'rgba(34,197,94,0.15)';
    resultEl.style.color = 'var(--green-light)';
    resultEl.textContent = `✅ Đã điểm danh: ${member.name}`;

    // Stop scanner after successful scan
    setTimeout(() => this.closeQrScanner(), 1500);
  }
};

// ── Event bindings
document.getElementById('attendanceSessionSelect').addEventListener('change', (e) => {
  Attendance.selectSession(e.target.value);
});

document.getElementById('saveAttendance').addEventListener('click', () => Attendance.save());
document.getElementById('markAllPresent').addEventListener('click', () => Attendance.markAll('present'));
document.getElementById('markAllAbsent').addEventListener('click', () => Attendance.markAll('absent'));
document.getElementById('openQrScannerBtn').addEventListener('click', () => Attendance.openQrScanner());
document.getElementById('closeQrScannerBtn').addEventListener('click', () => Attendance.closeQrScanner());

document.getElementById('openAttendanceModal').addEventListener('click', () => {
  App.navigate('sessions');
  setTimeout(() => Sessions.openAdd(), 200);
});

