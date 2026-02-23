import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const columns = await prisma.taskColumn.findMany({
      include: {
        tasks: {
          include: {
            assignedToUser: {
              select: { id: true, name: true },
            },
            assignedToAgent: {
              select: { id: true, name: true },
            },
            createdBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(columns);
  } catch (error) {
    console.error('Failed to fetch columns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch columns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
