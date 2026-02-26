import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidOrchestratorToken } from '@/lib/swarm/auth';
import { logSwarmActivity } from '@/lib/swarm/activity';

type PRPayload = {
  prNumber?: number;
  prUrl?: string;
  ciStatus?: string;
};

function mapPRStatus(ciStatus?: string): 'DRAFT' | 'OPEN' | 'MERGED' | 'CLOSED' {
  if (!ciStatus) {
    return 'OPEN';
  }

  const normalized = ciStatus.toLowerCase();
  if (normalized === 'merged') {
    return 'MERGED';
  }

  if (normalized === 'closed') {
    return 'CLOSED';
  }

  return 'OPEN';
}

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  try {
    if (!isValidOrchestratorToken(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as PRPayload;
    if (!payload.prNumber || !payload.prUrl) {
      return NextResponse.json(
        { error: 'prNumber and prUrl are required' },
        { status: 400 }
      );
    }

    const run = await prisma.swarmRun.findUnique({
      where: { id: params.runId },
      include: { task: { select: { createdById: true } } },
    });

    if (!run) {
      return NextResponse.json({ error: 'Swarm run not found' }, { status: 404 });
    }

    const existing = await prisma.swarmPR.findFirst({
      where: {
        prNumber: payload.prNumber,
      },
      select: {
        id: true,
        swarmRunId: true,
        url: true,
        status: true,
        metadata: true,
      },
    });

    const nextStatus = mapPRStatus(payload.ciStatus);
    const nextMetadata = { ciStatus: payload.ciStatus ?? 'unknown' };

    const upserted = existing
      ? await prisma.swarmPR.update({
          where: { id: existing.id },
          data: {
            swarmRunId: run.id,
            url: payload.prUrl,
            status: nextStatus,
            metadata: nextMetadata,
          },
          select: {
            id: true,
            swarmRunId: true,
            prNumber: true,
            url: true,
            status: true,
            metadata: true,
            updatedAt: true,
          },
        })
      : await prisma.swarmPR.create({
          data: {
            swarmRunId: run.id,
            prNumber: payload.prNumber,
            url: payload.prUrl,
            status: nextStatus,
            metadata: nextMetadata,
          },
          select: {
            id: true,
            swarmRunId: true,
            prNumber: true,
            url: true,
            status: true,
            metadata: true,
            updatedAt: true,
          },
        });

    const previousCiStatus =
      existing?.metadata && typeof existing.metadata === 'object' && existing.metadata !== null
        ? (existing.metadata as { ciStatus?: string }).ciStatus
        : undefined;

    const shouldLog =
      !existing ||
      existing.url !== payload.prUrl ||
      previousCiStatus !== payload.ciStatus ||
      existing.status !== nextStatus ||
      existing.swarmRunId !== run.id;

    if (shouldLog) {
      await logSwarmActivity({
        entityId: run.id,
        action: !existing ? 'swarm.pr_created' : 'swarm.pr_updated',
        performedBy: run.task.createdById,
        changes: {
          prNumber: payload.prNumber,
          prUrl: payload.prUrl,
          ciStatus: payload.ciStatus,
          status: nextStatus,
        },
      });
    }

    return NextResponse.json(upserted, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Failed to upsert swarm PR:', error);
    return NextResponse.json(
      {
        error: 'Failed to upsert swarm PR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
