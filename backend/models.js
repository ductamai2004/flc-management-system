const mongoose = require('mongoose');

// Account Schema (Admin access)
const accountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['admin', 'chairman', 'vice_chairman'], default: 'vice_chairman' },
  active: { type: Boolean, default: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  lastLoginAt: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
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
  avatar: { type: String, default: '' },
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
  proofImage: { type: String, default: '' },    // Base64 data URL of proof image
  recordedAt: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Account = mongoose.model('Account', accountSchema);
const Member = mongoose.model('Member', memberSchema);
const Session = mongoose.model('Session', sessionSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const FundCollection = mongoose.model('FundCollection', fundCollectionSchema);

module.exports = { Account, Member, Session, Attendance, Transaction, FundCollection };
