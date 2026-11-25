import { User } from '../models/User.js';
import { invalidCredentials } from '../utils/ApiError.js';
import { hashPassword, signSessionToken, verifyPassword } from '../middleware/auth.js';
import { toPublicUser } from '../utils/serializers.js';

export async function authenticateUser(email, password) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +tokenVersion');

  if (!user || user.isActive === false) {
    throw invalidCredentials();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw invalidCredentials();
  }

  return user;
}

export function createLoginResult(user, rememberMe = false) {
  return {
    user: toPublicUser(user),
    token: signSessionToken(user, rememberMe)
  };
}

export async function createUserWithPassword(userData) {
  const passwordHash = await hashPassword(userData.password);

  return User.create({
    name: userData.name,
    email: userData.email,
    passwordHash,
    role: userData.role,
    className: userData.className || '',
    studentId: userData.studentId || ''
  });
}

export { hashPassword };
