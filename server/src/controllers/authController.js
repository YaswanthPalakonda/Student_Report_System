import { asyncHandler } from '../utils/asyncHandler.js';
import { toPublicUser } from '../utils/serializers.js';
import {
  authenticateUser,
  createLoginResult
} from '../services/authService.js';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.validatedBody;
  const user = await authenticateUser(email, password);
  const result = createLoginResult(user, rememberMe);

  setSessionCookie(res, result.token, rememberMe);

  res.status(200).json({
    data: {
      user: result.user
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  clearSessionCookie(res);

  res.status(200).json({
    data: {
      loggedOut: true
    }
  });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    data: {
      user: toPublicUser(req.user)
    }
  });
});
