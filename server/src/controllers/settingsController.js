import { asyncHandler } from '../utils/asyncHandler.js';
import { getGradingPolicy, updateGradingPolicy } from '../services/gradingService.js';

export const getSettings = asyncHandler(async (req, res) => {
  const policy = await getGradingPolicy();

  res.status(200).json({
    data: {
      gradingPolicy: policy
    }
  });
});

export const putSettings = asyncHandler(async (req, res) => {
  const policy = await updateGradingPolicy(req.validatedBody, req.user._id);

  res.status(200).json({
    data: {
      gradingPolicy: policy
    }
  });
});
