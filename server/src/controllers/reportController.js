import { asyncHandler } from '../utils/asyncHandler.js';
import { parseQuery } from '../middleware/validate.js';
import { reportListQuerySchema } from '../validators/schemas.js';
import {
  createReport,
  getReportById,
  listReports,
  updateReport
} from '../services/reportService.js';

export const getReports = asyncHandler(async (req, res) => {
  const query = parseQuery(reportListQuerySchema, req.query);
  const result = await listReports(req.user, query);

  res.status(200).json({
    data: result
  });
});

export const getReport = asyncHandler(async (req, res) => {
  const report = await getReportById(req.user, req.params.id);

  res.status(200).json({
    data: {
      report
    }
  });
});

export const postReport = asyncHandler(async (req, res) => {
  const report = await createReport(req.user, req.validatedBody);

  res.status(201).json({
    data: {
      report
    }
  });
});

export const patchReport = asyncHandler(async (req, res) => {
  const report = await updateReport(req.user, req.params.id, req.validatedBody);

  res.status(200).json({
    data: {
      report
    }
  });
});
