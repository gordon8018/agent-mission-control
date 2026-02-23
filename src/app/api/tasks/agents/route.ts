import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        config: true,
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
