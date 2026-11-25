import { Router } from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import assignmentRoutes from './assignments.routes.js';
import reportRoutes from './reports.routes.js';
import settingsRoutes from './settings.routes.js';
import adminRoutes from './admin.routes.js';
import teacherRoutes from './teacher.routes.js';
import studentRoutes from './student.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

export default router;
