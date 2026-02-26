import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidOrchestratorToken } from '@/lib/swarm/auth';
import { logSwarmActivity } from '@/lib/swarm/activity';

type UpdatePayload = {
  status?:
    | 'PENDING'
    | 'RUNNING'
    | 'RETRY_REQUESTED'
    | 'SUCCESS'
    | 'FAILED'
    | 'CANCELLED';
  snapshot?: unknown;
  completedAt?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  try {
    if (!isValidOrchestratorToken(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as UpdatePayload;
    const run = await prisma.swarmRun.findUnique({
      where: { id: params.runId },
      include: {
        task: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Swarm run not found' }, { status: 404 });
    }

    const nextStatus = payload.status ?? run.status;
    const completedAt = payload.completedAt ? new Date(payload.completedAt) : undefined;

    const updatedRun = await prisma.swarmRun.update({
      where: { id: run.id },
      data: {
        status: nextStatus,
        snapshot: payload.snapshot ?? run.snapshot ?? undefined,
        completedAt,
      },
      select: {
        id: true,
        status: true,
        snapshot: true,
        completedAt: true,
        updatedAt: true,
      },
    });

    await logSwarmActivity({
      entityId: updatedRun.id,
      action: 'swarm.status_updated',
      performedBy: run.task.createdById,
      changes: {
        status: updatedRun.status,
        completedAt: updatedRun.completedAt,
      },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error('Failed to update swarm run:', error);
    return NextResponse.json(
      { error: 'Failed to update swarm run', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
