import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAgentWithActivities, getAgentActivities, assignTaskToAgent } from '@/app/team/actions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await getAgentWithActivities(id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, performedBy, limit } = body;

    switch (action) {
      case 'activities': {
        const activities = await getAgentActivities(id, limit || 10);
        return NextResponse.json(activities);
      }
      case 'assign': {
        const result = await assignTaskToAgent(body.taskId, id, performedBy);
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
