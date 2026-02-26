export type CIStatus = 'passed' | 'failed' | 'pending' | 'unknown';
export type ReviewStatus = 'approved' | 'changes_requested' | 'pending' | 'not_submitted';

export type RequiredReviews = {
  codex: boolean;
  gemini: boolean;
  claude: boolean;
};

export type DoDEvaluationInput = {
  prExists: boolean;
  ciStatus: CIStatus;
  reviewStatuses: {
    codex?: ReviewStatus;
    gemini?: ReviewStatus;
    claude?: ReviewStatus;
  };
  screenshotPresent: boolean;
  settings: {
    screenshotRequired: boolean;
    requiredReviews: RequiredReviews;
  };
};

export type DoDChecks = {
  prCreated: boolean;
  ciPassed: boolean;
  codexReviewPassed: boolean;
  geminiReviewPassed: boolean;
  claudeReviewPassed: boolean;
  screenshotProvided: boolean;
  screenshotRequirementMet: boolean;
};

export type DoDEvaluationResult = {
  checks: DoDChecks;
  overallReady: boolean;
};

const isApproved = (status?: ReviewStatus) => status === 'approved';

const reviewCheck = (required: boolean, status?: ReviewStatus) => {
  if (!required) return true;
  return isApproved(status);
};

export function evaluateDoD(input: DoDEvaluationInput): DoDEvaluationResult {
  const checks: DoDChecks = {
    prCreated: input.prExists,
    ciPassed: input.ciStatus === 'passed',
    codexReviewPassed: reviewCheck(input.settings.requiredReviews.codex, input.reviewStatuses.codex),
    geminiReviewPassed: reviewCheck(input.settings.requiredReviews.gemini, input.reviewStatuses.gemini),
    claudeReviewPassed: reviewCheck(input.settings.requiredReviews.claude, input.reviewStatuses.claude),
    screenshotProvided: input.screenshotPresent,
    screenshotRequirementMet: !input.settings.screenshotRequired || input.screenshotPresent,
  };

  return {
    checks,
    overallReady: Object.values(checks).every(Boolean),
  };
}
