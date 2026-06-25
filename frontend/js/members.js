/* ─── Members Module ───────────────────────────────────────────────────────── */

const Members = {
  _members: [],
  _attendanceStats: {},
  _editId: null,

  async load() {
    try {
      const [membersRes, statsRes] = await Promise.all([
        Api.get('/members'),
        Api.get('/stats')
      ]);
      this._members = membersRes.data;
      // Index member stats by memberId
      (statsRes.data.memberStats || []).forEach(s => {
        this._attendanceStats[s.memberId] = s;
      });
      this.render();
    } catch (err) {
      console.error('Members load error:', err);
      Toast.error('Không thể tải danh sách thành viên');
    }
  },

  render(filter = '') {
    const grid = document.getElementById('membersGrid');
    const roleFilter = document.getElementById('memberRoleFilter').value;

    let members = this._members.filter(m => m.active);
    if (filter) {
      const q = filter.toLowerCase();
      members = members.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    }
    if (roleFilter) {
      members = members.filter(m => m.role === roleFilter);
    }

    if (!members.length) {
      grid.innerHTML = `<div class="loading-placeholder">Không tìm thấy thành viên nào</div>`;
      return;
    }

    grid.innerHTML = members.map(m => this.renderCard(m)).join('');

    // Bind actions
    grid.querySelectorAll('[data-print]').forEach(btn => {
      btn.addEventListener('click', () => this.printCard(btn.dataset.print));
    });
    grid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.openEdit(btn.dataset.edit));
    });
    grid.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => this.delete(btn.dataset.delete));
    });
  },

  renderCard(member) {
    const stats = this._attendanceStats[member.id] || { present: 0, absent: 0, total: 0, rate: 0 };
    const initials = getInitials(member.name);
    
    let roleBadge = 'badge--gray';
    if (['Chủ nhiệm', 'Phó Chủ nhiệm', 'leader'].includes(member.role)) roleBadge = 'badge--purple';
    else if (member.role === 'Ban Chuyên môn') roleBadge = 'badge--blue';
    else if (member.role === 'Ban Truyền thông - Đối ngoại') roleBadge = 'badge--orange';
    else if (member.role === 'Ban Sự kiện') roleBadge = 'badge--green';
    
    const roleLabel = member.role === 'leader' ? 'Chủ nhiệm' : (member.role === 'member' ? 'Thành viên' : member.role);
    const rateClass = getRateClass(stats.rate);

    return `
      <div class="member-card">
        <div class="member-card-header">
          <div class="member-avatar">${initials}</div>
          <div class="member-card-actions">
            <button class="btn btn-icon btn-ghost" data-print="${member.id}" title="In thẻ thành viên" style="color:var(--purple-light)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost" data-edit="${member.id}" title="Chỉnh sửa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost" data-delete="${member.id}" title="Xóa" style="color: var(--red-light)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
        <div class="member-info">
          <div class="member-name">${member.name}</div>
          <div style="margin-bottom: 8px;"><span class="badge ${roleBadge}">${roleLabel}</span></div>
          ${member.mssv ? `<div class="member-role" style="margin-bottom:4px">MSSV: ${member.mssv}</div>` : ''}
          ${member.lop ? `<div class="member-role" style="margin-bottom:4px">Lớp: ${member.lop}</div>` : ''}
          ${member.dob ? `<div class="member-role" style="margin-bottom:4px">Ngày sinh: ${formatDate(member.dob)}</div>` : ''}
          ${member.joinDate ? `<div class="member-role" style="margin-bottom:4px">Tham gia: ${formatDate(member.joinDate)}</div>` : ''}
        </div>
        <div class="member-stats">
          <div class="member-stat">
            <div class="member-stat-value" style="color: var(--green-light)">${stats.present}</div>
            <div class="member-stat-label">Có mặt</div>
          </div>
          <div class="member-stat">
            <div class="member-stat-value" style="color: var(--red-light)">${stats.absent}</div>
            <div class="member-stat-label">Vắng</div>
          </div>
          <div class="member-stat">
            <div class="member-stat-value rate-badge rate-badge--${rateClass}" style="font-size:14px">${stats.rate}%</div>
            <div class="member-stat-label">Tỉ lệ</div>
          </div>
        </div>
        <div class="rate-bar" style="margin-top:10px">
          <div class="rate-bar-fill" style="width: ${stats.rate}%"></div>
        </div>
      </div>
    `;
  },

  openAdd() {
    this._editId = null;
    document.getElementById('memberModalTitle').textContent = 'Thêm thành viên mới';
    document.getElementById('memberFormId').value = '';
    document.getElementById('memberFormName').value = '';
    document.getElementById('memberFormRole').value = 'Thành viên';
    document.getElementById('memberFormMSSV').value = '';
    document.getElementById('memberFormLop').value = '';
    document.getElementById('memberFormDob').value = '';
    document.getElementById('memberFormFacebook').value = '';
    document.getElementById('memberFormDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('memberFormEmail').value = '';
    document.getElementById('memberFormPhone').value = '';
    openModal('memberModal');
  },

  async openEdit(id) {
    this._editId = id;
    const member = this._members.find(m => m.id === id);
    if (!member) return;

    document.getElementById('memberModalTitle').textContent = 'Chỉnh sửa thành viên';
    document.getElementById('memberFormId').value = member.id;
    document.getElementById('memberFormName').value = member.name;
    document.getElementById('memberFormRole').value = member.role || 'Thành viên';
    document.getElementById('memberFormMSSV').value = member.mssv || '';
    document.getElementById('memberFormLop').value = member.lop || '';
    
    let dobVal = member.dob || '';
    if (dobVal && dobVal.includes('-')) {
      const parts = dobVal.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        dobVal = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    document.getElementById('memberFormDob').value = dobVal;
    
    document.getElementById('memberFormFacebook').value = member.facebook || '';
    document.getElementById('memberFormDate').value = member.joinDate || '';
    document.getElementById('memberFormEmail').value = member.email || '';
    document.getElementById('memberFormPhone').value = member.phone || '';
    openModal('memberModal');
  },

  async save() {
    const name = document.getElementById('memberFormName').value.trim();
    if (!name) { Toast.error('Vui lòng nhập họ và tên'); return; }

    let dobRaw = document.getElementById('memberFormDob').value.trim();
    if (dobRaw.includes('/')) {
      const parts = dobRaw.split('/');
      if (parts.length === 3) dobRaw = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const data = {
      name,
      role: document.getElementById('memberFormRole').value,
      mssv: document.getElementById('memberFormMSSV').value.trim(),
      lop: document.getElementById('memberFormLop').value.trim(),
      dob: dobRaw,
      facebook: document.getElementById('memberFormFacebook').value.trim(),
      joinDate: document.getElementById('memberFormDate').value,
      email: document.getElementById('memberFormEmail').value.trim(),
      phone: document.getElementById('memberFormPhone').value.trim()
    };

    try {
      const btn = document.getElementById('saveMemberBtn');
      btn.disabled = true;
      btn.textContent = 'Đang lưu...';

      if (this._editId) {
        await Api.put(`/members/${this._editId}`, data);
        Toast.success('Đã cập nhật thông tin thành viên');
      } else {
        await Api.post('/members', data);
        Toast.success('Đã thêm thành viên mới');
      }

      closeModal('memberModal');
      await this.load();
    } catch (err) {
      Toast.error('Lỗi: ' + err.message);
    } finally {
      const btn = document.getElementById('saveMemberBtn');
      btn.disabled = false;
      btn.textContent = 'Lưu thành viên';
    }
  },

  async delete(id) {
    const member = this._members.find(m => m.id === id);
    if (!member) return;

    const confirmed = await Confirm.show(`Bạn có chắc chắn muốn xóa thành viên "${member.name}"?`, 'Xóa thành viên');
    if (!confirmed) return;

    try {
      await Api.delete(`/members/${id}`);
      Toast.success('Đã xóa thành viên');
      await this.load();
    } catch (err) {
      Toast.error('Không thể xóa: ' + err.message);
    }
  },

  async deleteAll() {
    if (!this._members.length) {
      Toast.info('Danh sách thành viên đang trống');
      return;
    }
    
    const confirmed = await Confirm.show(`CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ ${this._members.length} thành viên? Hành động này không thể hoàn tác và sẽ xóa luôn tất cả dữ liệu điểm danh liên quan!`, 'Xóa toàn bộ thành viên');
    if (!confirmed) return;

    try {
      await Api.delete('/members');
      Toast.success('Đã xóa toàn bộ thành viên');
      await this.load();
    } catch (err) {
      Toast.error('Không thể xóa: ' + err.message);
    }
  },

  printCard(id) {
    const member = this._members.find(m => m.id === id);
    if (!member) return;
    
    let roleLabel = 'Thành viên';
    if (member.role === 'leader' || member.role === 'Chủ nhiệm') roleLabel = 'Chủ nhiệm';
    else if (member.role === 'Phó Chủ nhiệm') roleLabel = 'Phó Chủ nhiệm';
    else if (member.role === 'Ban Chuyên môn') roleLabel = 'Ban Chuyên môn';
    else if (member.role === 'Ban Sự kiện') roleLabel = 'Ban Sự kiện';
    else if (member.role === 'Ban Truyền thông - Đối ngoại') roleLabel = 'Ban Truyền thông';

    const cardHtml = `
      <div id="printCardOuter" style="padding: 16px; background: #f8f9fa; display: inline-block;">
        <div id="printCardWrapper" style="width: 280px; border-radius: 16px; background: white; border: 2px solid #e2e8f0; display: flex; flex-direction: column; font-family: Arial, sans-serif; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 20px 20px; text-align: center; color: white;">
            <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.8; margin-bottom: 4px;">CLB TIẾNG ANH</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">VKU FLC</h2>
            <div style="font-size: 11px; opacity: 0.85; margin-top: 4px;">English Club • Thẻ thành viên</div>
          </div>
          <div style="padding: 24px 20px; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #ede9fe, #c4b5fd); color: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; margin-bottom: 12px; border: 3px solid #6366f1;">
              ${getInitials(member.name)}
            </div>
            <div style="font-size: 17px; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 4px;">${member.name}</div>
            <div style="display: inline-block; font-size: 11px; color: white; font-weight: 700; background: #6366f1; padding: 3px 12px; border-radius: 20px; margin-bottom: 16px;">${roleLabel}</div>
            
            <div style="width: 100%; font-size: 12px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; flex-direction: column; gap: 5px;">
              ${member.mssv ? `<div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">MSSV</span><strong style="color:#1e293b;">${member.mssv}</strong></div>` : ''}
              ${member.lop ? `<div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Lớp</span><strong style="color:#1e293b;">${member.lop}</strong></div>` : ''}
            </div>

            <div style="margin-top: 16px; padding: 8px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: center;" id="qrcode-${member.id}"></div>
            <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; text-align: center;">Quét QR để điểm danh</div>
          </div>
          <div style="background: #f8fafc; padding: 10px 16px; text-align: center; border-top: 1px solid #f1f5f9;">
            <div style="font-size: 10px; color: #94a3b8; letter-spacing: 0.5px;">Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('memberCardPreview').innerHTML = cardHtml;
    openModal('memberCardModal');
    
    // Store current member for PDF generation
    this._currentPrintMember = member;

    // Generate QR Code
    setTimeout(() => {
      new QRCode(document.getElementById(`qrcode-${member.id}`), {
        text: member.id,
        width: 80,
        height: 80,
        colorDark : "#1e293b",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
      });
    }, 100);
  },

  downloadCardPdf() {
    if (!this._currentPrintMember) return;
    // Use the outer wrapper (with padding) so border/corners aren't clipped
    const element = document.getElementById('printCardOuter');
    
    const btn = document.getElementById('printMemberCardBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Đang tải PDF...';

    const safeName = this._currentPrintMember.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    const opt = {
      margin:       0,
      filename:     `The_Thanh_Vien_${safeName}.pdf`,
      image:        { type: 'png', quality: 1 },
      html2canvas:  { scale: 3, useCORS: true, backgroundColor: '#f8f9fa', logging: false },
      jsPDF:        { unit: 'mm', format: [90, 150], orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      closeModal('memberCardModal');
      Toast.success('Đã tải xuống thẻ thành viên PDF');
    }).catch(err => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      Toast.error('Lỗi khi tạo PDF: ' + err.message);
    });
  },

  openBulkEmail() {
    document.getElementById('bulkEmailSubject').value = 'Thông báo từ CLB Tiếng Anh VKU';
    document.getElementById('bulkEmailContent').value = '';
    document.getElementById('bulkEmailStatus').style.display = 'none';
    openModal('bulkEmailModal');
  },

  async sendBulkEmail() {
    const target = document.getElementById('bulkEmailTarget').value;
    const subject = document.getElementById('bulkEmailSubject').value.trim();
    const content = document.getElementById('bulkEmailContent').value.trim();

    if (!subject || !content) {
      Toast.error('Vui lòng nhập tiêu đề và nội dung email');
      return;
    }

    let targetMembers = [];
    if (target === 'all') {
      targetMembers = this._members.filter(m => m.active && m.email);
    } else if (target === 'absent3') {
      targetMembers = this._members.filter(m => {
        if (!m.active || !m.email) return false;
        const stats = this._attendanceStats[m.id];
        return stats && stats.absent >= 3;
      });
    } else if (target === 'absent5') {
      targetMembers = this._members.filter(m => {
        if (!m.active || !m.email) return false;
        const stats = this._attendanceStats[m.id];
        return stats && stats.absent >= 5;
      });
    }

    if (!targetMembers.length) {
      Toast.error('Không có thành viên nào phù hợp hoặc không có email');
      return;
    }

    const btn = document.getElementById('confirmBulkEmailBtn');
    const statusEl = document.getElementById('bulkEmailStatus');
    
    btn.disabled = true;
    btn.textContent = 'Đang gửi...';
    statusEl.style.display = 'block';
    statusEl.style.background = 'rgba(99,102,241,0.1)';
    statusEl.style.color = 'var(--purple-light)';
    statusEl.textContent = `Đang chuẩn bị gửi đến ${targetMembers.length} thành viên...`;

    try {
      const res = await Api.post('/email/send-bulk', {
        memberIds: targetMembers.map(m => m.id),
        subject,
        htmlContent: content
      });

      if (res.success) {
        Toast.success(`Đã gửi email thành công đến ${res.sentCount} người`);
        closeModal('bulkEmailModal');
      }
    } catch (err) {
      statusEl.style.background = 'rgba(255,75,75,0.1)';
      statusEl.style.color = 'var(--red-light)';
      statusEl.textContent = 'Lỗi: ' + err.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Gửi email
      `;
    }
  }
};

// ── Event bindings
document.getElementById('addMemberBtn').addEventListener('click', () => Members.openAdd());
document.getElementById('cancelMemberModal').addEventListener('click', () => closeModal('memberModal'));
document.getElementById('saveMemberBtn').addEventListener('click', () => Members.save());
document.getElementById('deleteAllMembersBtn').addEventListener('click', () => Members.deleteAll());

document.getElementById('closeMemberCardBtn').addEventListener('click', () => closeModal('memberCardModal'));
document.getElementById('closeMemberCardBtn2').addEventListener('click', () => closeModal('memberCardModal'));
document.getElementById('printMemberCardBtn').addEventListener('click', () => Members.downloadCardPdf());

document.getElementById('bulkEmailBtn').addEventListener('click', () => Members.openBulkEmail());
document.getElementById('closeBulkEmailBtn').addEventListener('click', () => closeModal('bulkEmailModal'));
document.getElementById('cancelBulkEmailBtn').addEventListener('click', () => closeModal('bulkEmailModal'));
document.getElementById('confirmBulkEmailBtn').addEventListener('click', () => Members.sendBulkEmail());

// Search & filter
let searchTimer;
document.getElementById('memberSearch').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => Members.render(e.target.value), 250);
});

document.getElementById('memberRoleFilter').addEventListener('change', () => {
  Members.render(document.getElementById('memberSearch').value);
});

// Import Excel for members
document.getElementById('importMembersBtn').addEventListener('click', () => {
  document.getElementById('importFileInput').value = '';
  document.getElementById('importResult').style.display = 'none';
  document.getElementById('confirmImport').disabled = true;
  openModal('importModal');
});

let _importFile = null;

document.getElementById('importFileInput').addEventListener('change', (e) => {
  _importFile = e.target.files[0];
  if (_importFile) {
    document.getElementById('confirmImport').disabled = false;
    const resultEl = document.getElementById('importResult');
    resultEl.style.display = 'block';
    resultEl.className = 'import-result info';
    resultEl.textContent = `Đã chọn: ${_importFile.name}`;
  }
});

// Drag & drop
const dropzone = document.getElementById('importDropzone');
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && /\.xlsx?$/i.test(file.name)) {
    _importFile = file;
    document.getElementById('confirmImport').disabled = false;
    const resultEl = document.getElementById('importResult');
    resultEl.style.display = 'block';
    resultEl.className = 'import-result';
    resultEl.textContent = `Đã chọn: ${file.name}`;
  }
});

document.getElementById('cancelImportModal').addEventListener('click', () => closeModal('importModal'));
document.getElementById('closeImportModal').addEventListener('click', () => closeModal('importModal'));

document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
  window.location.href = '/api/template';
});

document.getElementById('confirmImport').addEventListener('click', async () => {
  if (!_importFile) return;
  const btn = document.getElementById('confirmImport');
  btn.disabled = true;
  btn.textContent = 'Đang nhập...';

  try {
    const res = await Api.uploadFile('/import', _importFile);
    const resultEl = document.getElementById('importResult');
    resultEl.style.display = 'block';
    resultEl.className = 'import-result success';
    resultEl.textContent = res.message || `Nhập thành công ${res.imported} thành viên`;
    Toast.success(res.message || 'Nhập dữ liệu thành công');
    await Members.load();
    setTimeout(() => closeModal('importModal'), 1500);
  } catch (err) {
    const resultEl = document.getElementById('importResult');
    resultEl.style.display = 'block';
    resultEl.className = 'import-result error';
    resultEl.textContent = 'Lỗi: ' + err.message;
    Toast.error('Nhập thất bại: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Nhập dữ liệu';
  }
});
