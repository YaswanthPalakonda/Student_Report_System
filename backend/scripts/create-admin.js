import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { password } from '../validators/index.js';

try {
  if (process.env.PROVISION_ADMIN !== 'yes') throw new Error('Provisioning requires PROVISION_ADMIN=yes.');
  const input = z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().toLowerCase().email(), password }).parse({
    name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  });
  await connectDB();
  await User.init();
  if (await User.exists({ email: input.email })) throw new Error('Account already exists; provisioning never overwrites accounts.');
  await User.create({ name: input.name, email: input.email, role: 'admin', passwordHash: await bcrypt.hash(input.password, 12) });
  console.log('Administrator provisioned. Remove ADMIN_PASSWORD and PROVISION_ADMIN from the private environment.');
} catch {
  console.error('Administrator was not provisioned. Verify the setup flag, profile/password requirements, unique email, and database configuration.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
