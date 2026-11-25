import { Router } from 'express';

import { adminOverview } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));
router.get('/overview', adminOverview);

export default router;
