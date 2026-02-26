import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logSwarmActivity } from '@/lib/swarm/activity';

export async function POST(
  _request: Request,
  { params }: { params: { runId: string } }
) {
  try {
    const runId = params.runId;

    const existingRun = await prisma.swarmRun.findUnique({
      where: { id: runId },
      include: {
        task: {
          select: { createdById: true },
        },
      },
    });

    if (!existingRun) {
      return NextResponse.json({ error: 'Swarm run not found' }, { status: 404 });
    }

    const updatedRun = await prisma.swarmRun.update({
      where: { id: runId },
      data: {
        retryRequested: true,
        status: 'RETRY_REQUESTED',
      },
      select: {
        id: true,
        status: true,
        retryRequested: true,
        updatedAt: true,
      },
    });

    await logSwarmActivity({
      entityId: updatedRun.id,
      action: 'swarm.status_updated',
      performedBy: existingRun.task.createdById,
      changes: {
        status: updatedRun.status,
        retryRequested: updatedRun.retryRequested,
      },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error('Failed to request swarm retry:', error);
    return NextResponse.json(
      { error: 'Failed to request swarm retry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
