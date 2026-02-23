import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAgent, updateAgent, deleteAgent, assignTaskToAgent } from '@/app/team/actions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as string | undefined;
    const status = searchParams.get('status') as string | undefined;

    const agents = await prisma.agent.findMany({
      where: {
        ...(role && {
          config: {
            path: ['role'],
            equals: role,
          },
        }),
        ...(status && { status }),
      },
      include: {
        assignedTasks: {
          where: {
            status: { not: 'DONE' },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        executedRuns: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, performedBy, ...data } = body;

    switch (action) {
      case 'create': {
        const result = await createAgent({ ...data, createdBy: performedBy });
        return NextResponse.json(result);
      }
      case 'update': {
        const result = await updateAgent(data.id, data, performedBy);
        return NextResponse.json(result);
      }
      case 'delete': {
        const result = await deleteAgent(data.id, performedBy);
        return NextResponse.json(result);
      }
      case 'assign': {
        const result = await assignTaskToAgent(data.taskId, data.agentId, performedBy);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to process request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
