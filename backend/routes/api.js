import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, roles } from '../middleware/security.js';
import { authController } from '../controllers/auth.js';
import * as admin from '../controllers/admin.js';
import * as reports from '../controllers/reports.js';
import * as v from '../validators/index.js';

export function apiRoutes(config) {
  const router = Router();
  const auth = authController(config);
  router.post('/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'Too many sign-in attempts. Try again later.' } }), v.validate(v.login), auth.login);
  router.use(authenticate(config));
  router.get('/auth/me', auth.me);
  router.post('/auth/logout', auth.logout);
  router.get('/admin/dashboard', roles('admin'), admin.dashboard);
  router.get('/users', roles('admin'), admin.listUsers);
  router.post('/users', roles('admin'), v.validate(v.createUser), admin.createUser);
  router.get('/users/:id', roles('admin'), v.validateId, admin.getUser);
  router.patch('/users/:id', roles('admin'), v.validateId, v.validate(v.editUser), admin.editUser);
  router.delete('/users/:id', roles('admin'), v.validateId, admin.deactivateUser);
  for (const [path, controller] of [['classes', admin.classes], ['subjects', admin.subjects]]) {
    router.get(`/${path}`, controller.list);
    router.post(`/${path}`, roles('admin'), v.validate(v.catalog), controller.create);
    router.patch(`/${path}/:id`, roles('admin'), v.validateId, v.validate(v.catalog), controller.update);
    router.delete(`/${path}/:id`, roles('admin'), v.validateId, controller.remove);
  }
  router.get('/assignments', roles('admin', 'teacher'), admin.listAssignments);
  router.post('/assignments', roles('admin'), v.validate(v.assignment), admin.saveAssignment);
  router.patch('/assignments/:id', roles('admin'), v.validateId, v.validate(v.assignment), admin.saveAssignment);
  router.delete('/assignments/:id', roles('admin'), v.validateId, admin.deleteAssignment);
  router.get('/grading-settings', admin.getSettings);
  router.put('/grading-settings', roles('admin'), v.validate(v.grading), admin.saveSettings);
  router.get('/teacher/students', roles('teacher'), reports.roster);
  router.get('/student/summary', roles('student'), reports.summary);
  router.get('/reports', reports.list);
  router.get('/reports/:id', v.validateId, reports.get);
  router.post('/reports', roles('teacher'), v.validate(v.report), reports.save);
  router.patch('/reports/:id', roles('teacher'), v.validateId, v.validate(v.editReport), reports.save);
  router.delete('/reports/:id', roles('admin'), v.validateId, reports.remove);
  return router;
}
