import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
try {
  await connectDB();
  await mongoose.connection.db.admin().ping();
  console.log('Database ping passed. No academic records were changed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
