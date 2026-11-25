import { Router } from 'express';

import {
  getAssignments,
  postAssignment,
  removeAssignment
} from '../controllers/assignmentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateBody } from '../middleware/validate.js';
import { createAssignmentSchema } from '../validators/schemas.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN, ROLES.TEACHER));

router.get('/', getAssignments);
router.post('/', requireRole(ROLES.ADMIN), validateBody(createAssignmentSchema), postAssignment);
router.delete('/:id', requireRole(ROLES.ADMIN), removeAssignment);

export default router;
