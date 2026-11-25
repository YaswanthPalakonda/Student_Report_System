import { asyncHandler } from '../utils/asyncHandler.js';
import { parseQuery } from '../middleware/validate.js';
import { userListQuerySchema } from '../validators/schemas.js';
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser
} from '../services/userService.js';

export const getUsers = asyncHandler(async (req, res) => {
  const query = parseQuery(userListQuerySchema, req.query);
  const users = await listUsers(query);

  res.status(200).json({
    data: {
      users,
      count: users.length
    }
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);

  res.status(200).json({
    data: {
      user
    }
  });
});

export const postUser = asyncHandler(async (req, res) => {
  const user = await createUser(req.validatedBody);

  res.status(201).json({
    data: {
      user
    }
  });
});

export const patchUser = asyncHandler(async (req, res) => {
  const user = await updateUser(req.params.id, req.validatedBody);

  res.status(200).json({
    data: {
      user
    }
  });
});

export const removeUser = asyncHandler(async (req, res) => {
  const deleted = await deleteUser(req.params.id);

  res.status(200).json({
    data: deleted
  });
});
