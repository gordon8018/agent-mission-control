import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchMemories } from '../actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const memories = await searchMemories(query);

    return NextResponse.json(memories);
  } catch (error) {
    console.error('Failed to search memories:', error);
    return NextResponse.json(
      { error: 'Failed to search memories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
