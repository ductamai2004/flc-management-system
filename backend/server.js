require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const mongoose = require('mongoose');
const { Member, Session, Attendance, Transaction, FundCollection } = require('./models');

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

function processAvatarUrl(url) {
  if (!url) return '';
  let avatar = String(url).trim();
  if (avatar.includes('drive.google.com/file/d/')) {
    const match = avatar.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  } else if (avatar.includes('drive.google.com/open?id=')) {
    const match = avatar.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  } else if (avatar.includes('drive.google.com/uc?')) {
    const match = avatar.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return avatar;
}

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
    const { name, role, joinDate, email, phone, mssv, lop, dob, facebook, avatar } = req.body;
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
      avatar: processAvatarUrl(avatar),
      active: true
    });
    await newMember.save();
    res.status(201).json({ success: true, data: newMember });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.avatar) updateData.avatar = processAvatarUrl(updateData.avatar);
    
    const updated = await Member.findOneAndUpdate({ id: req.params.id }, updateData, { new: true }).lean();
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
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">NHẮC NHỞ THAM GIA SINH HOẠT CLB TIẾNG ANH VKU</h2>
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
    `;

    const gasUrl = 'https://script.google.com/macros/s/AKfycbzVkpiW5xfUjB31muPV6dIOFyWqsOhvrdlnVZUjUT359XDBY5kp-5KnEvRBhb6wvBBK/exec';
    
    // Call Google Apps Script Web App
    const response = await axios.post(gasUrl, {
      to: email,
      subject: 'Nhắc nhở tham gia sinh hoạt CLB Tiếng Anh VKU',
      html: htmlBody
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const result = response.data;
    
    if (result.success) {
      res.json({ success: true, message: 'Đã gửi email thành công qua Apps Script' });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi từ Google Apps Script: ' + result.error });
    }
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi email: ' + err.message });
  }
});

app.post('/api/email/send-bulk', async (req, res) => {
  const { memberIds, subject, htmlContent } = req.body;
  if (!memberIds || !memberIds.length || !subject || !htmlContent) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  }

  try {
    const members = await Member.find({ id: { $in: memberIds }, active: true }).lean();
    let sentCount = 0;
    const gasUrl = 'https://script.google.com/macros/s/AKfycbzVkpiW5xfUjB31muPV6dIOFyWqsOhvrdlnVZUjUT359XDBY5kp-5KnEvRBhb6wvBBK/exec';

    for (const member of members) {
      if (!member.email) continue;
      
      const personalizedHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0;">${subject}</h2>
          </div>
          <div style="padding: 20px;">
            <p>Chào <strong>${member.name}</strong>,</p>
            <div>${htmlContent.replace(/\n/g, '<br/>')}</div>
            <br/>
            <p>Trân trọng,<br/><strong>Ban Chủ nhiệm CLB Tiếng Anh VKU.</strong></p>
          </div>
          <div style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #888;">
            Đây là email tự động từ Hệ thống quản lý nhân sự CLB Tiếng Anh VKU.
          </div>
        </div>
      `;

      try {
        const response = await axios.post(gasUrl, {
          to: member.email,
          subject: subject,
          html: personalizedHtml
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        const result = response.data;
        if (result.success) sentCount++;
      } catch (e) {
        console.error('Lỗi gửi email cho', member.email, e.message);
      }
    }

    res.json({ success: true, message: `Đã gửi ${sentCount} email`, sentCount });
  } catch (err) {
    console.error('Bulk email error:', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi email hàng loạt: ' + err.message });
  }
});

// ─── Finance ─────────────────────────────────────────────────────────────────
app.get('/api/finance/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().lean();
    res.json({ success: true, data: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/finance/transactions', async (req, res) => {
  try {
    const { type, amount, date, description, category } = req.body;
    if (!type || !amount || !date || !description) return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    
    const newTx = new Transaction({
      id: uuidv4(), type, amount: Number(amount), date, description, category: category || 'Khác'
    });
    await newTx.save();
    res.status(201).json({ success: true, data: newTx });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/finance/transactions/:id', async (req, res) => {
  try {
    const deleted = await Transaction.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    res.json({ success: true, message: 'Đã xóa giao dịch' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/finance/funds', async (req, res) => {
  try {
    const funds = await FundCollection.find().lean();
    res.json({ success: true, data: funds });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/finance/funds', async (req, res) => {
  try {
    const { memberId, month, amount } = req.body;
    if (!memberId || !month) return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });

    const fundAmount = Number(amount) || 20000;
    
    const member = await Member.findOne({ id: memberId }).lean();
    const memberName = member ? member.name : 'Thành viên';
    
    // Tự động tạo 1 Transaction Thu
    const newTx = new Transaction({
      id: uuidv4(),
      type: 'income',
      amount: fundAmount,
      date: new Date().toISOString().split('T')[0],
      description: `Thu quỹ tháng ${month} - ${memberName}`,
      category: 'Quỹ'
    });
    await newTx.save();

    const record = new FundCollection({
      id: uuidv4(),
      memberId,
      month,
      amount: fundAmount,
      transactionId: newTx.id
    });
    await record.save();

    res.status(201).json({ success: true, data: record });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/finance/funds/:id', async (req, res) => {
  try {
    const record = await FundCollection.findOneAndDelete({ id: req.params.id });
    if (!record) return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi nộp quỹ' });
    
    // Xóa luôn transaction liên kết
    if (record.transactionId) {
      await Transaction.findOneAndDelete({ id: record.transactionId });
    }
    
    res.json({ success: true, message: 'Đã hủy nộp quỹ' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.patch('/api/finance/funds/:id/proof', async (req, res) => {
  try {
    const { proofImage } = req.body;
    if (!proofImage) return res.status(400).json({ success: false, message: 'Missing proofImage' });
    
    const record = await FundCollection.findOneAndUpdate(
      { id: req.params.id },
      { proofImage },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi nộp quỹ' });
    
    res.json({ success: true, data: record });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const members = await Member.find().lean();
    const sessions = await Session.find().lean();
    const attendance = await Attendance.find().lean();
    const transactions = await Transaction.find().lean();

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

    // Tính toán tài chính
    let totalFund = 0;
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    
    const currentMonthPrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalFund += tx.amount;
        if (tx.date.startsWith(currentMonthPrefix)) currentMonthIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalFund -= tx.amount;
        if (tx.date.startsWith(currentMonthPrefix)) currentMonthExpense += tx.amount;
      }
    });

    res.json({
      success: true,
      data: {
        totalMembers,
        totalSessions,
        overallRate,
        presentTotal: presentRecords,
        memberStats: memberStats.sort((a, b) => b.rate - a.rate),
        sessionStats: sessionStats.sort((a, b) => new Date(b.date) - new Date(a.date)),
        finance: {
          totalFund,
          currentMonthIncome,
          currentMonthExpense
        }
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
      if (hLower.includes('avatar') || hLower.includes('ảnh đại diện')) colMap.avatar = idx;
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
      const avatar = colMap.avatar !== undefined && row[colMap.avatar] ? processAvatarUrl(row[colMap.avatar]) : '';

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
          avatar,
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
        if(row[colMap.avatar]) member.avatar = avatar;
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

    const fmtDate = (d) => {
      if (!d) return '';
      if (d.includes('-')) {
        const p = d.split('-');
        if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
      }
      return d;
    };

    const getMembersData = () => {
      const headers = ['STT', 'Họ và Tên', 'MSSV', 'Lớp', 'Ngày sinh', 'Vai trò', 'Email', 'Số điện thoại', 'Link Facebook'];
      const rows = members.filter(m => m.active).map((member, idx) => [
        idx + 1, member.name, member.mssv || '', member.lop || '', fmtDate(member.dob),
        member.role || '', member.email || '', member.phone || '', member.facebook || ''
      ]);
      return [headers, ...rows];
    };

    const getSessionsData = () => {
      const headers = ['STT', 'Buổi sinh hoạt', 'Ngày', 'Nội dung buổi sinh hoạt', 'Số lượng có mặt', 'Số lượng vắng', 'Tỉ lệ có mặt (%)'];
      const rows = sessions.map((session, idx) => {
        const sa = attendance.filter(a => a.sessionId === session.id);
        const present = sa.filter(a => a.status === 'present').length;
        const absent = sa.filter(a => a.status === 'absent').length;
        const total = present + absent;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return [idx + 1, session.name, fmtDate(session.date), session.topic || '', present, absent, `${rate}%`];
      });
      return [headers, ...rows];
    };

    const getAttendanceData = () => {
      const headers = ['STT', 'Họ và Tên', 'MSSV', 'Lớp', ...sessions.map(s => s.name), 'Tổng buổi', 'Có mặt (%)'];
      const rows = members.filter(m => m.active).map((member, idx) => {
        const ma = attendance.filter(a => a.memberId === member.id);
        const sessionStatuses = sessions.map(session => {
          const rec = ma.find(a => a.sessionId === session.id);
          return rec ? (rec.status === 'present' ? 'Có mặt' : rec.status === 'absent' ? 'Vắng' : '-') : '-';
        });
        const present = ma.filter(a => a.status === 'present').length;
        const total = ma.filter(a => a.status === 'present' || a.status === 'absent').length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return [idx + 1, member.name, member.mssv || '', member.lop || '', ...sessionStatuses, total, `${rate}%`];
      });
      return [headers, ...rows];
    };

    const wb = XLSX.utils.book_new();
    let fileName = '';

    if (type === 'reports') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getAttendanceData()), 'Điểm danh');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getMembersData()), 'Thành viên');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getSessionsData()), 'Buổi sinh hoạt');
      fileName = 'FLC_Bao_Cao_Tong_Hop.xlsx';
    } else if (type === 'members') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getMembersData()), 'Thành viên');
      fileName = 'FLC_Thanh_Vien.xlsx';
    } else if (type === 'sessions') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getSessionsData()), 'Buổi sinh hoạt');
      fileName = 'FLC_Buoi_Sinh_Hoat.xlsx';
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getAttendanceData()), 'Điểm danh');
      fileName = 'FLC_Diem_Danh.xlsx';
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/export/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ id: sessionId }).lean();
    if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy buổi sinh hoạt' });

    const members = await Member.find({ active: true }).lean();
    const attendance = await Attendance.find({ sessionId }).lean();

    const fmtDate = (d) => {
      if (!d) return '';
      if (d.includes('-')) {
        const p = d.split('-');
        if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
      }
      return d;
    };

    const headers = ['STT', 'Họ và Tên', 'MSSV', 'Lớp', 'Vai trò', 'Trạng thái'];
    const rows = members.map((member, idx) => {
      const rec = attendance.find(a => a.memberId === member.id);
      let status = 'Chưa ghi nhận';
      if (rec) {
        if (rec.status === 'present') status = 'Có mặt';
        else if (rec.status === 'absent') status = 'Vắng';
      }
      return [idx + 1, member.name, member.mssv || '', member.lop || '', member.role || '', status];
    });

    const data = [headers, ...rows];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Diem_Danh');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeName = session.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    res.setHeader('Content-Disposition', `attachment; filename="DiemDanh_${safeName}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
