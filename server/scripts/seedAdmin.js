import { connectDB, disconnectDB } from '../src/config/db.js';
import { getAdminSeedConfig } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { ensureDefaultGradingPolicy } from '../src/services/gradingService.js';
import { hashPassword } from '../src/services/authService.js';
import { toPublicUser } from '../src/utils/serializers.js';

async function seedAdmin() {
  const config = getAdminSeedConfig();

  await connectDB();
  await ensureDefaultGradingPolicy();

  const existing = await User.findOne({ email: config.email }).select('+passwordHash +tokenVersion');

  if (existing && existing.role !== 'admin') {
    throw new Error(
      `A non-admin account already uses ${config.email}. Choose a different ADMIN_EMAIL.`
    );
  }

  if (existing && existing.role === 'admin') {
    if (!config.resetPassword) {
      console.log(`[seed] Admin account already exists: ${existing.email} (${existing._id.toString()})`);
      console.log('[seed] No password was changed. Set ADMIN_RESET_PASSWORD=true to reset intentionally.');
      return;
    }

    existing.passwordHash = await hashPassword(config.password);
    existing.tokenVersion = Number(existing.tokenVersion || 0) + 1;
    existing.isActive = true;
    await existing.save();

    console.log(`[seed] Admin password reset and existing sessions invalidated: ${existing.email}`);
    return;
  }

  const passwordHash = await hashPassword(config.password);

  const admin = await User.create({
    name: config.name,
    email: config.email,
    passwordHash,
    role: 'admin',
    className: '',
    studentId: '',
    isActive: true
  });

  console.log('[seed] Admin account created successfully.');
  console.log(`[seed] ${JSON.stringify(toPublicUser(admin))}`);
}

seedAdmin()
  .catch(error => {
    console.error('[seed] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await disconnectDB();
    } catch {
      // Ignore disconnect errors during shutdown.
    }
  });
