import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logSwarmActivity } from '@/lib/swarm/activity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId } = body as { taskId?: string };

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, createdById: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const run = await prisma.swarmRun.create({
      data: {
        taskId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        status: true,
        createdAt: true,
      },
    });

    await logSwarmActivity({
      entityId: run.id,
      action: 'swarm.run_created',
      performedBy: task.createdById,
      changes: {
        taskId: run.taskId,
        status: run.status,
      },
    });

    return NextResponse.json({ runId: run.id, status: run.status }, { status: 201 });
  } catch (error) {
    console.error('Failed to start swarm run:', error);
    return NextResponse.json(
      { error: 'Failed to start swarm run', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
