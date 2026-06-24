require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { Member, Session, Attendance } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── MongoDB Connection ──────────────────────────────────────────────────────
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── Multer for file uploads ──────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `upload_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.xlsx', '.xls'].includes(ext)) cb(null, true);
  else cb(new Error('Only Excel files allowed'));
}});

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Members ─────────────────────────────────────────────────────────────────
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.find().lean();
    res.json({ success: true, data: members });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const member = await Member.findOne({ id: req.params.id }).lean();
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: member });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/members', async (req, res) => {
  try {
    const { name, role, joinDate, email, phone, mssv, lop, dob, facebook } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });

    const count = await Member.countDocuments();
    const newMember = new Member({
      id: uuidv4(),
      stt: count + 1,
      name: name.trim(),
      role: role || 'Thành viên',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      email: email || '',
      phone: phone || '',
      mssv: mssv || '',
      lop: lop || '',
      dob: dob || '',
      facebook: facebook || '',
      active: true
    });
    await newMember.save();
    res.status(201).json({ success: true, data: newMember });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const updated = await Member.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const deleted = await Member.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, message: 'Member deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/members', async (req, res) => {
  try {
    await Member.deleteMany({});
    await Attendance.deleteMany({});
    res.json({ success: true, message: 'All members deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Sessions ────────────────────────────────────────────────────────────────
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await Session.find().lean();
    res.json({ success: true, data: sessions.sort((a, b) => new Date(b.date) - new Date(a.date)) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { name, date, topic } = req.body;
    if (!name || !date) return res.status(400).json({ success: false, message: 'Name and date are required' });

    const newSession = new Session({ id: uuidv4(), name: name.trim(), date, topic: topic || '' });
    await newSession.save();
    res.status(201).json({ success: true, data: newSession });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    const updated = await Session.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const deleted = await Session.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Session not found' });
    await Attendance.deleteMany({ sessionId: req.params.id });
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Attendance ──────────────────────────────────────────────────────────────
app.get('/api/attendance', async (req, res) => {
  try {
    const { sessionId, memberId } = req.query;
    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (memberId) filter.memberId = memberId;
    const attendance = await Attendance.find(filter).lean();
    res.json({ success: true, data: attendance });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { memberId, sessionId, status, note } = req.body;
    if (!memberId || !sessionId || !status) return res.status(400).json({ success: false, message: 'Missing fields' });

    let record = await Attendance.findOne({ memberId, sessionId });
    if (record) {
      record.status = status;
      record.note = note || '';
      record.recordedAt = new Date().toISOString();
      await record.save();
      return res.json({ success: true, data: record, updated: true });
    }

    record = new Attendance({ id: uuidv4(), memberId, sessionId, status, note: note || '' });
    await record.save();
    res.status(201).json({ success: true, data: record });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/attendance/bulk', async (req, res) => {
  try {
    const { sessionId, records } = req.body;
    if (!sessionId || !Array.isArray(records)) return res.status(400).json({ success: false, message: 'Invalid data' });

    for (const rec of records) {
      const { memberId, status, note } = rec;
      await Attendance.findOneAndUpdate(
        { memberId, sessionId },
        { id: uuidv4(), memberId, sessionId, status, note: note || '', recordedAt: new Date().toISOString() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    res.json({ success: true, message: `Updated ${records.length} records` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Email ───────────────────────────────────────────────────────────────────
app.post('/api/email/send-warning', async (req, res) => {
  const { memberId, name, email, absentCount } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Thành viên không có địa chỉ email' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"VKU FOREIGN LANGUAGE CLUB" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Nhắc nhở tham gia sinh hoạt CLB Tiếng Anh VKU',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0;">Thông Báo Điểm Danh</h2>
          </div>
          <div style="padding: 20px;">
            <p>Chào <strong>${name}</strong>,</p>
            <p>Ban Chủ nhiệm CLB Tiếng Anh VKU xin thông báo: Hiện tại bạn đã vắng mặt <strong style="color:red">${absentCount}</strong> buổi sinh hoạt.</p>
            <p>Việc tham gia đầy đủ và tích cực là một trong những tiêu chí quan trọng để duy trì tư cách thành viên và đảm bảo hiệu quả hoạt động của CLB.</p>
            <p>Mong bạn sắp xếp thời gian để tham gia đầy đủ các buổi sinh hoạt sắp tới. Nếu có lý do chính đáng, vui lòng phản hồi lại email này hoặc liên hệ trực tiếp với Ban Chủ nhiệm CLB Tiếng Anh VKU.</p>
            <br/>
            <p>Trân trọng,<br/><strong>Ban Chủ nhiệm CLB Tiếng Anh VKU.</strong></p>
          </div>
          <div style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #888;">
            Đây là email tự động từ Hệ thống quản lý nhân sự CLB Tiếng Anh VKU.
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Đã gửi email thành công' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi email: ' + err.message });
  }
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const members = await Member.find().lean();
    const sessions = await Session.find().lean();
    const attendance = await Attendance.find().lean();

    const totalMembers = members.filter(m => m.active).length;
    const totalSessions = sessions.length;

    const presentRecords = attendance.filter(a => a.status === 'present').length;
    const totalRecords = attendance.filter(a => a.status !== 'not_recorded').length;
    const overallRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    const memberStats = members.filter(m => m.active).map(member => {
      const memberAttendance = attendance.filter(a => a.memberId === member.id && a.status !== 'not_recorded');
      const present = memberAttendance.filter(a => a.status === 'present').length;
      const total = memberAttendance.length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { memberId: member.id, name: member.name, email: member.email || '', present, absent: total - present, total, rate };
    });

    const sessionStats = sessions.map(session => {
      const sessionAttendance = attendance.filter(a => a.sessionId === session.id && a.status !== 'not_recorded');
      const present = sessionAttendance.filter(a => a.status === 'present').length;
      const total = sessionAttendance.length;
      return { sessionId: session.id, name: session.name, date: session.date, present, absent: total - present, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    });

    res.json({
      success: true,
      data: {
        totalMembers,
        totalSessions,
        overallRate,
        presentTotal: presentRecords,
        memberStats: memberStats.sort((a, b) => b.rate - a.rate),
        sessionStats: sessionStats.sort((a, b) => new Date(b.date) - new Date(a.date))
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Excel Import ─────────────────────────────────────────────────────────────
app.post('/api/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const wb = XLSX.readFile(req.file.path);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    let imported = 0;
    const headers = data[0] || [];
    const colMap = {};
    headers.forEach((h, idx) => {
      if (!h || typeof h !== 'string') return;
      const hLower = h.toLowerCase().trim();
      if (hLower.includes('họ') || hLower.includes('tên') || hLower.includes('name')) colMap.name = idx;
      if (hLower.includes('vai trò') || hLower.includes('role')) colMap.role = idx;
      if (hLower.includes('mssv') || hLower.includes('mã')) colMap.mssv = idx;
      if (hLower.includes('lớp') || hLower.includes('class')) colMap.lop = idx;
      if (hLower.includes('ngày sinh') || hLower.includes('dob')) colMap.dob = idx;
      if (hLower.includes('email')) colMap.email = idx;
      if (hLower.includes('điện thoại') || hLower.includes('sdt') || hLower.includes('phone')) colMap.phone = idx;
      if (hLower.includes('facebook') || hLower.includes('fb')) colMap.facebook = idx;
    });

    if (colMap.name === undefined) colMap.name = 1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = row[colMap.name];
      if (!name || typeof name !== 'string') continue;
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      const role = colMap.role !== undefined && row[colMap.role] ? String(row[colMap.role]).trim() : 'Thành viên';
      const mssv = colMap.mssv !== undefined && row[colMap.mssv] ? String(row[colMap.mssv]).trim() : '';
      const lop = colMap.lop !== undefined && row[colMap.lop] ? String(row[colMap.lop]).trim() : '';
      
      let dob = '';
      if (colMap.dob !== undefined && row[colMap.dob] !== undefined && row[colMap.dob] !== null) {
        const rawDob = row[colMap.dob];
        if (typeof rawDob === 'number') {
          const date = new Date(Math.round((rawDob - 25569) * 86400 * 1000));
          if (!isNaN(date)) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            dob = `${y}-${m}-${d}`;
          }
        } else {
          let s = String(rawDob).trim();
          if (s.includes('/')) {
            const parts = s.split('/');
            if (parts.length === 3) {
              if (parts[2].length === 4) dob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              else if (parts[0].length === 4) dob = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              else dob = s;
            } else dob = s;
          } else if (s.includes('-')) {
             const parts = s.split('-');
             if (parts.length === 3 && parts[2].length === 4) dob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
             else dob = s;
          } else dob = s;
        }
      }

      const email = colMap.email !== undefined && row[colMap.email] ? String(row[colMap.email]).trim() : '';
      const phone = colMap.phone !== undefined && row[colMap.phone] ? String(row[colMap.phone]).trim() : '';
      const facebook = colMap.facebook !== undefined && row[colMap.facebook] ? String(row[colMap.facebook]).trim() : '';

      // Find member case insensitive
      let member = await Member.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
      
      if (!member) {
        const count = await Member.countDocuments();
        member = new Member({
          id: uuidv4(),
          stt: count + 1,
          name: trimmedName,
          role,
          joinDate: new Date().toISOString().split('T')[0],
          email,
          phone,
          mssv,
          lop,
          dob,
          facebook,
          active: true
        });
      } else {
        if(row[colMap.role]) member.role = role;
        if(row[colMap.mssv]) member.mssv = mssv;
        if(row[colMap.lop]) member.lop = lop;
        if(row[colMap.dob]) member.dob = dob;
        if(row[colMap.email]) member.email = email;
        if(row[colMap.phone]) member.phone = phone;
        if(row[colMap.facebook]) member.facebook = facebook;
      }
      await member.save();
      imported++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, message: `Imported ${imported} members`, imported });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to parse Excel: ' + err.message });
  }
});

// ─── Excel Export ─────────────────────────────────────────────────────────────
app.get('/api/export', async (req, res) => {
  try {
    const type = req.query.type || 'attendance';
    const members = await Member.find().lean();
    let sessions = await Session.find().lean();
    const attendance = await Attendance.find().lean();
    sessions = sessions.sort((a, b) => new Date(a.date) - new Date(b.date));

    let headers = [];
    let rows = [];
    let sheetName = '';
    let fileName = '';

    if (type === 'members') {
      headers = ['STT', 'Họ và Tên', 'Vai trò', 'MSSV', 'Lớp', 'Ngày sinh', 'Link Facebook', 'Email', 'Số điện thoại', 'Ngày tham gia', 'Trạng thái'];
      rows = members.map((member, idx) => {
        let exportDob = member.dob || '';
        if (exportDob.includes('-')) {
          const parts = exportDob.split('-');
          if (parts.length === 3 && parts[0].length === 4) exportDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        let exportJoin = member.joinDate || '';
        if (exportJoin.includes('-')) {
          const parts = exportJoin.split('-');
          if (parts.length === 3 && parts[0].length === 4) exportJoin = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return [idx + 1, member.name, member.role, member.mssv || '', member.lop || '', exportDob, member.facebook || '', member.email || '', member.phone || '', exportJoin, member.active ? 'Hoạt động' : 'Nghỉ'];
      });
      sheetName = 'Thành viên';
      fileName = 'FLC_Thanh_Vien.xlsx';
    } else if (type === 'sessions') {
      headers = ['STT', 'Tên buổi sinh hoạt', 'Ngày', 'Nội dung', 'Số lượng có mặt', 'Số lượng vắng'];
      rows = sessions.map((session, idx) => {
        const sessionAttendance = attendance.filter(a => a.sessionId === session.id);
        const presentCount = sessionAttendance.filter(a => a.status === 'present').length;
        const absentCount = sessionAttendance.filter(a => a.status === 'absent').length;
        
        let exportDate = session.date || '';
        if (exportDate.includes('-')) {
          const parts = exportDate.split('-');
          if (parts.length === 3 && parts[0].length === 4) exportDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return [idx + 1, session.name, exportDate, session.topic || '', presentCount, absentCount];
      });
      sheetName = 'Buổi học';
      fileName = 'FLC_Buoi_Hoc.xlsx';
    } else { // attendance
      headers = ['STT', 'Họ và Tên', 'Vai trò', 'MSSV', 'Lớp', 'Ngày sinh', 'Link Facebook', ...sessions.map(s => s.name), 'Tổng buổi có mặt', 'Tỉ lệ (%)'];
      rows = members.filter(m => m.active).map((member, idx) => {
        const memberAttendance = attendance.filter(a => a.memberId === member.id);
        const sessionStatuses = sessions.map(session => {
          const rec = memberAttendance.find(a => a.sessionId === session.id);
          return rec ? (rec.status === 'present' ? 'Có mặt' : rec.status === 'absent' ? 'Vắng' : '-') : '-';
        });
        const present = memberAttendance.filter(a => a.status === 'present').length;
        const total = memberAttendance.filter(a => a.status !== 'not_recorded').length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        
        let exportDob = member.dob || '';
        if (exportDob.includes('-')) {
          const parts = exportDob.split('-');
          if (parts.length === 3 && parts[0].length === 4) exportDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return [idx + 1, member.name, member.role, member.mssv || '', member.lop || '', exportDob, member.facebook || '', ...sessionStatuses, present, `${rate}%`];
      });
      sheetName = 'Điểm danh';
      fileName = 'FLC_Diem_Danh.xlsx';
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/template', (req, res) => {
  const headers = ['STT', 'Họ và Tên', 'Vai trò', 'MSSV', 'Lớp', 'Ngày sinh', 'Email', 'Số điện thoại', 'Link Facebook'];
  const sampleRow = [1, 'Nguyễn Văn A', 'Thành viên', '24SE123', '24SE1', '01/01/2005', 'nva@gmail.com', '0123456789', 'https://facebook.com/nva'];
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  
  ws['!cols'] = [{wch: 5}, {wch: 25}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 35}];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Nhap_Lieu');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', 'attachment; filename="FLC_Template_Nhap_Thanh_Vien.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// ─── Serve Frontend ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎉 FLC Attendance System running at http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});
