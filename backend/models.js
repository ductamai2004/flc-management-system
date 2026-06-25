const mongoose = require('mongoose');

// Member Schema
const memberSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  stt: { type: Number, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Thành viên' },
  joinDate: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  mssv: { type: String, default: '' },
  lop: { type: String, default: '' },
  dob: { type: String, default: '' },
  facebook: { type: String, default: '' },
  active: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Session Schema
const sessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  topic: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },
  sessionId: { type: String, required: true },
  status: { type: String, required: true },
  note: { type: String, default: '' },
  recordedAt: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Transaction Schema (Quản lý Thu/Chi chung)
const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  description: { type: String, required: true },
  category: { type: String, default: 'Khác' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// FundCollection Schema (Quản lý thu quỹ thành viên)
const fundCollectionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },
  month: { type: String, required: true }, // YYYY-MM
  amount: { type: Number, required: true, default: 20000 },
  transactionId: { type: String, default: '' }, // Link to the generated Transaction
  recordedAt: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Member = mongoose.model('Member', memberSchema);
const Session = mongoose.model('Session', sessionSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const FundCollection = mongoose.model('FundCollection', fundCollectionSchema);

module.exports = { Member, Session, Attendance, Transaction, FundCollection };
