import { asyncHandler } from '../utils/asyncHandler.js';
import { parseQuery } from '../middleware/validate.js';
import { teacherStudentsQuerySchema } from '../validators/schemas.js';
import {
  getAdminOverview,
  getStudentOverview,
  getTeacherOverview,
  getTeacherRoster,
  getTeacherStudents
} from '../services/dashboardService.js';

export const adminOverview = asyncHandler(async (req, res) => {
  const overview = await getAdminOverview();

  res.status(200).json({
    data: {
      overview
    }
  });
});

export const teacherOverview = asyncHandler(async (req, res) => {
  const overview = await getTeacherOverview(req.user);

  res.status(200).json({
    data: {
      overview
    }
  });
});

export const teacherStudents = asyncHandler(async (req, res) => {
  const query = parseQuery(teacherStudentsQuerySchema, req.query);
  const result = await getTeacherStudents(req.user, query);

  res.status(200).json({
    data: result
  });
});

export const teacherRoster = asyncHandler(async (req, res) => {
  const query = parseQuery(teacherStudentsQuerySchema, req.query);
  const result = await getTeacherRoster(req.user, query);

  res.status(200).json({
    data: result
  });
});

export const studentOverview = asyncHandler(async (req, res) => {
  const overview = await getStudentOverview(req.user);

  res.status(200).json({
    data: {
      overview
    }
  });
});
