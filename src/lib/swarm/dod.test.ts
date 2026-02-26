import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDoD } from '@/lib/swarm/dod';

test('evaluateDoD marks overallReady when every required gate passes', () => {
  const result = evaluateDoD({
    prExists: true,
    ciStatus: 'passed',
    reviewStatuses: {
      codex: 'approved',
      gemini: 'approved',
      claude: 'approved',
    },
    screenshotPresent: true,
    settings: {
      screenshotRequired: true,
      requiredReviews: {
        codex: true,
        gemini: true,
        claude: true,
      },
    },
  });

  assert.equal(result.overallReady, true);
  assert.deepEqual(result.checks, {
    prCreated: true,
    ciPassed: true,
    codexReviewPassed: true,
    geminiReviewPassed: true,
    claudeReviewPassed: true,
    screenshotProvided: true,
    screenshotRequirementMet: true,
  });
});

test('evaluateDoD ignores reviews that are not required', () => {
  const result = evaluateDoD({
    prExists: true,
    ciStatus: 'passed',
    reviewStatuses: {
      codex: 'approved',
      gemini: 'pending',
      claude: 'changes_requested',
    },
    screenshotPresent: false,
    settings: {
      screenshotRequired: false,
      requiredReviews: {
        codex: true,
        gemini: false,
        claude: false,
      },
    },
  });

  assert.equal(result.checks.geminiReviewPassed, true);
  assert.equal(result.checks.claudeReviewPassed, true);
  assert.equal(result.checks.screenshotRequirementMet, true);
  assert.equal(result.overallReady, false);
});

test('evaluateDoD fails when any required review, CI, or PR gate fails', () => {
  const result = evaluateDoD({
    prExists: false,
    ciStatus: 'failed',
    reviewStatuses: {
      codex: 'changes_requested',
    },
    screenshotPresent: true,
    settings: {
      screenshotRequired: false,
      requiredReviews: {
        codex: true,
        gemini: false,
        claude: false,
      },
    },
  });

  assert.equal(result.checks.prCreated, false);
  assert.equal(result.checks.ciPassed, false);
  assert.equal(result.checks.codexReviewPassed, false);
  assert.equal(result.overallReady, false);
});

test('evaluateDoD fails when screenshot is required but missing', () => {
  const result = evaluateDoD({
    prExists: true,
    ciStatus: 'passed',
    reviewStatuses: {
      codex: 'approved',
    },
    screenshotPresent: false,
    settings: {
      screenshotRequired: true,
      requiredReviews: {
        codex: true,
        gemini: false,
        claude: false,
      },
    },
  });

  assert.equal(result.checks.screenshotProvided, false);
  assert.equal(result.checks.screenshotRequirementMet, false);
  assert.equal(result.overallReady, false);
});
