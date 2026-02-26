import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ACTIVE_STATUSES = ['PENDING', 'RUNNING', 'RETRY_REQUESTED'] as const;

export async function GET() {
  try {
    const runs = await prisma.swarmRun.findMany({
      where: {
        status: {
          in: [...ACTIVE_STATUSES],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        taskId: true,
        status: true,
        retryRequested: true,
        startedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Failed to load active swarm runs:', error);
    return NextResponse.json(
      { error: 'Failed to load active swarm runs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
