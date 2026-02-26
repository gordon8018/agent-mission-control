import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidOrchestratorToken } from '@/lib/swarm/auth';
import { logSwarmActivity } from '@/lib/swarm/activity';

type WorktreePayload = {
  path?: string;
  branch?: string;
  baseBranch?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  try {
    if (!isValidOrchestratorToken(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as WorktreePayload;
    if (!payload.path || !payload.branch || !payload.baseBranch) {
      return NextResponse.json(
        { error: 'path, branch, and baseBranch are required' },
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

    const existing = await prisma.swarmWorktree.findFirst({
      where: {
        swarmRunId: run.id,
        branch: payload.branch,
      },
      select: { id: true, path: true, metadata: true },
    });

    const metadata = {
      baseBranch: payload.baseBranch,
    };

    const upserted = existing
      ? await prisma.swarmWorktree.update({
          where: { id: existing.id },
          data: {
            path: payload.path,
            metadata,
            status: 'READY',
          },
          select: {
            id: true,
            swarmRunId: true,
            branch: true,
            path: true,
            status: true,
            metadata: true,
            updatedAt: true,
          },
        })
      : await prisma.swarmWorktree.create({
          data: {
            swarmRunId: run.id,
            branch: payload.branch,
            path: payload.path,
            metadata,
            status: 'READY',
          },
          select: {
            id: true,
            swarmRunId: true,
            branch: true,
            path: true,
            status: true,
            metadata: true,
            updatedAt: true,
          },
        });

    const previousBaseBranch =
      existing?.metadata && typeof existing.metadata === 'object' && existing.metadata !== null
        ? (existing.metadata as { baseBranch?: string }).baseBranch
        : undefined;

    const shouldLog =
      !existing ||
      existing.path !== upserted.path ||
      previousBaseBranch !== payload.baseBranch;

    if (shouldLog) {
      await logSwarmActivity({
        entityId: run.id,
        action: !existing ? 'swarm.worktree_created' : 'swarm.worktree_updated',
        performedBy: run.task.createdById,
        changes: {
          branch: upserted.branch,
          path: upserted.path,
          baseBranch: payload.baseBranch,
        },
      });
    }

    return NextResponse.json(upserted, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Failed to upsert swarm worktree:', error);
    return NextResponse.json(
      {
        error: 'Failed to upsert swarm worktree',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
