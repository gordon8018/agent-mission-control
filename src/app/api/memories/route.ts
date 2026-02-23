import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemories } from '../actions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as 'MANUAL' | 'TASK_DONE' | 'RUN_FINISHED' | undefined;
    const sourceRefId = searchParams.get('sourceRefId') as string | undefined;
    const tag = searchParams.get('tag') as string | undefined;

    const memories = await getMemories({
      source,
      sourceRefId,
      tag,
    });

    return NextResponse.json(memories);
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create': {
        const { createMemory } = await import('../actions');
        const result = await createMemory(data);
        return NextResponse.json(result);
      }
      case 'update': {
        const { updateMemory } = await import('../actions');
        const result = await updateMemory(data.id, data, data.performedBy);
        return NextResponse.json(result);
      }
      case 'delete': {
        const { deleteMemory } = await import('../actions');
        const result = await deleteMemory(data.id, data.performedBy);
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
