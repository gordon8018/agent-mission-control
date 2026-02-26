import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidOrchestratorToken } from '@/lib/swarm/auth';
import { logSwarmActivity } from '@/lib/swarm/activity';

type SessionPayload = {
  tmuxSessionName?: string;
  agentKind?: string;
  modelName?: string;
  logPath?: string;
  status?: 'STARTING' | 'ACTIVE' | 'IDLE' | 'COMPLETED' | 'FAILED';
};

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  try {
    if (!isValidOrchestratorToken(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as SessionPayload;
    if (!payload.tmuxSessionName) {
      return NextResponse.json(
        { error: 'tmuxSessionName is required' },
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

    const nextStatus = payload.status ?? 'ACTIVE';
    const nextMetadata = {
      agentKind: payload.agentKind,
      modelName: payload.modelName,
      logPath: payload.logPath,
      tmuxSessionName: payload.tmuxSessionName,
    };

    const existing = await prisma.swarmSession.findFirst({
      where: {
        swarmRunId: run.id,
        externalId: payload.tmuxSessionName,
      },
      select: {
        id: true,
        status: true,
        metadata: true,
      },
    });

    const upserted = existing
      ? await prisma.swarmSession.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            metadata: nextMetadata,
          },
          select: {
            id: true,
            swarmRunId: true,
            externalId: true,
            status: true,
            metadata: true,
            updatedAt: true,
          },
        })
      : await prisma.swarmSession.create({
          data: {
            swarmRunId: run.id,
            externalId: payload.tmuxSessionName,
            status: nextStatus,
            metadata: nextMetadata,
          },
          select: {
            id: true,
            swarmRunId: true,
            externalId: true,
            status: true,
            metadata: true,
            updatedAt: true,
          },
        });

    const previousMetadata = existing?.metadata as
      | { agentKind?: string; modelName?: string; logPath?: string }
      | undefined;

    const shouldLog =
      !existing ||
      existing.status !== nextStatus ||
      previousMetadata?.agentKind !== payload.agentKind ||
      previousMetadata?.modelName !== payload.modelName ||
      previousMetadata?.logPath !== payload.logPath;

    if (shouldLog) {
      await logSwarmActivity({
        entityId: run.id,
        action: !existing ? 'swarm.session_created' : 'swarm.session_updated',
        performedBy: run.task.createdById,
        changes: {
          tmuxSessionName: payload.tmuxSessionName,
          status: nextStatus,
          agentKind: payload.agentKind,
          modelName: payload.modelName,
        },
      });
    }

    return NextResponse.json(upserted, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Failed to upsert swarm session:', error);
    return NextResponse.json(
      {
        error: 'Failed to upsert swarm session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
