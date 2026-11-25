import { GradingPolicy } from '../models/GradingPolicy.js';
import { DEFAULT_GRADING_POLICY } from '../utils/constants.js';
import { ApiError, notFound } from '../utils/ApiError.js';
import { toPublicGradingPolicy } from '../utils/serializers.js';
import { validateGradeThresholds } from './gradeService.js';

const POLICY_KEY = 'default';

function defaultPolicyDocument() {
  return {
    key: POLICY_KEY,
    passMark: DEFAULT_GRADING_POLICY.passMark,
    grades: DEFAULT_GRADING_POLICY.grades.map(grade => ({ ...grade }))
  };
}

export async function ensureDefaultGradingPolicy() {
  try {
    await GradingPolicy.updateOne(
      { key: POLICY_KEY },
      { $setOnInsert: defaultPolicyDocument() },
      { upsert: true }
    );
  } catch (error) {
    // Concurrent serverless cold starts can race on the unique key.
    if (error?.code !== 11000) {
      throw error;
    }
  }
}

export async function getGradingPolicyDocument() {
  let policy = await GradingPolicy.findOne({ key: POLICY_KEY });

  if (!policy) {
    await ensureDefaultGradingPolicy();
    policy = await GradingPolicy.findOne({ key: POLICY_KEY });
  }

  if (!policy) {
    throw new ApiError(500, 'GRADING_POLICY_UNAVAILABLE', 'The grading policy could not be loaded.');
  }

  return policy;
}

export async function getGradingPolicy() {
  return toPublicGradingPolicy(await getGradingPolicyDocument());
}

export async function updateGradingPolicy(input, userId) {
  const validation = validateGradeThresholds(input.grades);

  if (!validation.valid) {
    throw new ApiError(422, 'INVALID_GRADING_POLICY', validation.message, {
      fields: [{ field: 'grades', message: validation.message }]
    });
  }

  if (!Number.isFinite(Number(input.passMark)) || Number(input.passMark) < 0 || Number(input.passMark) > 100) {
    throw new ApiError(422, 'INVALID_GRADING_POLICY', 'Pass mark must be between 0 and 100.');
  }

  const policy = await GradingPolicy.findOneAndUpdate(
    { key: POLICY_KEY },
    {
      $set: {
        passMark: Number(input.passMark),
        grades: validation.grades,
        updatedBy: userId
      },
      $setOnInsert: { key: POLICY_KEY }
    },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (!policy) {
    throw notFound('The grading policy could not be updated.');
  }

  return toPublicGradingPolicy(policy);
}
