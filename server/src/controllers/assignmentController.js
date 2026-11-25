import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createAssignment,
  deleteAssignment,
  listAssignments
} from '../services/assignmentService.js';

export const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await listAssignments(req.user);

  res.status(200).json({
    data: {
      assignments,
      count: assignments.length
    }
  });
});

export const postAssignment = asyncHandler(async (req, res) => {
  const assignment = await createAssignment(req.validatedBody);

  res.status(201).json({
    data: {
      assignment
    }
  });
});

export const removeAssignment = asyncHandler(async (req, res) => {
  const deleted = await deleteAssignment(req.params.id);

  res.status(200).json({
    data: deleted
  });
});
