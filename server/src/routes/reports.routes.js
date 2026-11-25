import { Router } from 'express';

import {
  getReport,
  getReports,
  patchReport,
  postReport
} from '../controllers/reportController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateBody } from '../middleware/validate.js';
import { createReportSchema, updateReportSchema } from '../validators/schemas.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(requireAuth);

router.get('/', getReports);
router.get('/:id', getReport);
router.post('/', requireRole(ROLES.TEACHER), validateBody(createReportSchema), postReport);
router.patch('/:id', requireRole(ROLES.TEACHER), validateBody(updateReportSchema), patchReport);

export default router;
