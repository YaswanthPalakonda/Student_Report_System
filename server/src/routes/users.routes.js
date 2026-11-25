import { Router } from 'express';

import {
  getUser,
  getUsers,
  patchUser,
  postUser,
  removeUser
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../validators/schemas.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/', getUsers);
router.post('/', validateBody(createUserSchema), postUser);
router.get('/:id', getUser);
router.patch('/:id', validateBody(updateUserSchema), patchUser);
router.delete('/:id', removeUser);

export default router;
