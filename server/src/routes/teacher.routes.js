import { Router } from 'express';

import {
  teacherOverview,
  teacherRoster,
  teacherStudents
} from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.TEACHER));
router.get('/overview', teacherOverview);
router.get('/students', teacherStudents);
router.get('/roster', teacherRoster);

export default router;
