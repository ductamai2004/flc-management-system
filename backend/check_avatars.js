const mongoose = require('mongoose');
require('dotenv').config();
const { Member } = require('./models');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const members = await Member.find({ avatar: { $regex: 'drive.google.com' } });
  console.log('Found ' + members.length + ' drive avatars');
  members.slice(0, 5).forEach(m => console.log(m.name, '->', m.avatar));
  process.exit(0);
}).catch(console.error);