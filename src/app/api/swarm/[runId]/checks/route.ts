import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidOrchestratorToken } from '@/lib/swarm/auth';
import { logSwarmActivity } from '@/lib/swarm/activity';

type ChecksPayload = {
  checksJson?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: { runId: string } }
) {
  try {
    if (!isValidOrchestratorToken(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as ChecksPayload;
    if (payload.checksJson === undefined) {
      return NextResponse.json(
        { error: 'checksJson is required' },
        { status: 400 }
      );
    }

    const run = await prisma.swarmRun.findUnique({
      where: { id: params.runId },
      include: {
        task: { select: { createdById: true } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Swarm run not found' }, { status: 404 });
    }

    const swarmPr = await prisma.swarmPR.findFirst({
      where: { swarmRunId: run.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    if (!swarmPr) {
      return NextResponse.json(
        { error: 'No PR found for this run. Submit PR payload first.' },
        { status: 400 }
      );
    }

    const checksDetails =
      typeof payload.checksJson === 'string'
        ? payload.checksJson
        : JSON.stringify(payload.checksJson);

    const status = checksDetails.toLowerCase().includes('fail') ? 'FAILED' : 'PASSED';

    const existing = await prisma.swarmCheck.findFirst({
      where: {
        swarmPrId: swarmPr.id,
        name: 'orchestrator_checks',
      },
      select: {
        id: true,
        details: true,
        status: true,
      },
    });

    const saved = existing
      ? await prisma.swarmCheck.update({
          where: { id: existing.id },
          data: {
            details: checksDetails,
            status,
            metadata: {
              source: 'openclaw-orchestrator',
              updatedAt: new Date().toISOString(),
            },
          },
          select: {
            id: true,
            name: true,
            status: true,
            details: true,
            updatedAt: true,
          },
        })
      : await prisma.swarmCheck.create({
          data: {
            swarmPrId: swarmPr.id,
            name: 'orchestrator_checks',
            details: checksDetails,
            status,
            metadata: {
              source: 'openclaw-orchestrator',
              updatedAt: new Date().toISOString(),
            },
          },
          select: {
            id: true,
            name: true,
            status: true,
            details: true,
            updatedAt: true,
          },
        });

    const shouldLog = !existing || existing.details !== checksDetails || existing.status !== status;

    if (shouldLog) {
      await logSwarmActivity({
        entityId: run.id,
        action: !existing ? 'swarm.checks_created' : 'swarm.checks_updated',
        performedBy: run.task.createdById,
        changes: {
          checkName: 'orchestrator_checks',
          status,
        },
      });
    }

    return NextResponse.json(saved, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Failed to ingest swarm checks:', error);
    return NextResponse.json(
      {
        error: 'Failed to ingest swarm checks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
