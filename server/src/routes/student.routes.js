import { Router } from 'express';

import { studentOverview } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.STUDENT));
router.get('/overview', studentOverview);

export default router;
