import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidOrchestratorToken } from '@/lib/swarm/auth';
import { evaluateDoD, type CIStatus, type RequiredReviews, type ReviewStatus } from '@/lib/swarm/dod';

const DEFAULT_REQUIRED_REVIEWS: RequiredReviews = {
  codex: true,
  gemini: false,
  claude: false,
};

type EvaluatePayload = {
  ciStatus?: CIStatus;
  reviewStatuses?: {
    codex?: ReviewStatus;
    gemini?: ReviewStatus;
    claude?: ReviewStatus;
  };
  screenshotPresent?: boolean;
};

function parseRequiredReviews(value: unknown): RequiredReviews {
  if (!value || typeof value !== 'object') {
    return DEFAULT_REQUIRED_REVIEWS;
  }

  const candidate = value as Partial<RequiredReviews>;
  return {
    codex: candidate.codex ?? DEFAULT_REQUIRED_REVIEWS.codex,
    gemini: candidate.gemini ?? DEFAULT_REQUIRED_REVIEWS.gemini,
    claude: candidate.claude ?? DEFAULT_REQUIRED_REVIEWS.claude,
  };
}

export async function POST(
  request: Request,
  { params }: { params: { prId: string } }
) {
  try {
    if (!isValidOrchestratorToken(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as EvaluatePayload;

    const swarmPr = await prisma.swarmPR.findUnique({
      where: { id: params.prId },
      select: { id: true },
    });

    if (!swarmPr) {
      return NextResponse.json({ error: 'Swarm PR not found' }, { status: 404 });
    }

    const settings = await prisma.orchestratorSetting.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        screenshotRequired: true,
        requiredReviews: true,
      },
    });

    const result = evaluateDoD({
      prExists: true,
      ciStatus: payload.ciStatus ?? 'unknown',
      reviewStatuses: payload.reviewStatuses ?? {},
      screenshotPresent: payload.screenshotPresent ?? false,
      settings: {
        screenshotRequired: settings?.screenshotRequired ?? false,
        requiredReviews: parseRequiredReviews(settings?.requiredReviews),
      },
    });

    const savedCheck = await prisma.swarmCheck.create({
      data: {
        swarmPrId: swarmPr.id,
        name: 'dod_evaluation',
        status: result.overallReady ? 'PASSED' : 'FAILED',
        details: result.overallReady
          ? 'Definition of Done passed'
          : 'Definition of Done failed',
        metadata: {
          ciStatus: payload.ciStatus ?? 'unknown',
          reviewStatuses: payload.reviewStatuses ?? {},
          screenshotPresent: payload.screenshotPresent ?? false,
          checks: result.checks,
          overallReady: result.overallReady,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      checks: result.checks,
      overallReady: result.overallReady,
      snapshot: savedCheck,
    });
  } catch (error) {
    console.error('Failed to evaluate DoD:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate DoD', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
