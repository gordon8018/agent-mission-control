import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logSwarmActivity } from '@/lib/swarm/activity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, mcAgentId, openclawAgentId } = body as {
      taskId?: string;
      mcAgentId?: string;
      openclawAgentId?: string;
    };

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

    const normalizedMcAgentId = mcAgentId?.trim() || null;
    const trimmedOpenClawAgentId = openclawAgentId?.trim() || null;
    let resolvedOpenClawAgentId = trimmedOpenClawAgentId;
    let selectedMcAgentId: string | null = normalizedMcAgentId;

    if (normalizedMcAgentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: normalizedMcAgentId },
        select: { id: true, openclawAgentId: true },
      });

      if (!agent) {
        return NextResponse.json({ error: 'MC Agent not found' }, { status: 404 });
      }

      resolvedOpenClawAgentId = agent.openclawAgentId?.trim() || null;
      selectedMcAgentId = agent.id;
    }

    const blockReason = resolvedOpenClawAgentId ? null : 'No OpenClaw agent linked';

    const run = await prisma.swarmRun.create({
      data: {
        taskId,
        status: blockReason ? 'PENDING' : 'RUNNING',
        startedAt: blockReason ? null : new Date(),
        orchestratorAgentId: resolvedOpenClawAgentId,
        blockReason,
      },
      select: {
        id: true,
        taskId: true,
        status: true,
        orchestratorAgentId: true,
        blockReason: true,
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
        orchestratorAgentId: run.orchestratorAgentId,
        blockReason: run.blockReason,
        selectedMcAgentId,
        inputOpenClawAgentId: trimmedOpenClawAgentId,
      },
    });

    await logSwarmActivity({
      entityId: run.id,
      action: 'swarm.mapping_selected',
      performedBy: task.createdById,
      changes: {
        selectedMcAgentId,
        inputOpenClawAgentId: trimmedOpenClawAgentId,
        resolvedOpenClawAgentId,
        blocked: Boolean(blockReason),
        blockReason,
      },
    });

    return NextResponse.json(
      {
        runId: run.id,
        status: run.status,
        orchestratorAgentId: run.orchestratorAgentId,
        blocked: Boolean(run.blockReason),
        blockReason: run.blockReason,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to start swarm run:', error);
    return NextResponse.json(
      { error: 'Failed to start swarm run', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
