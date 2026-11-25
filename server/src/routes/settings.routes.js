import { Router } from 'express';

import { getSettings, putSettings } from '../controllers/settingsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateBody } from '../middleware/validate.js';
import { updateGradingPolicySchema } from '../validators/schemas.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', requireRole(ROLES.ADMIN), validateBody(updateGradingPolicySchema), putSettings);

export default router;
