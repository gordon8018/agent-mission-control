import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      totalTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      upcomingEvents,
      recentActivities,
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({
        where: { status: 'IN_PROGRESS' },
      }),
      prisma.task.count({
        where: { status: 'DONE' },
      }),
      prisma.task.count({
        where: {
          dueDate: { lt: new Date() },
          status: { not: 'DONE' },
        },
      }),
      prisma.event.count({
        where: {
          startAt: { gte: new Date() },
        },
      }),
      prisma.activity.findMany({
        include: {
          performer: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      totalTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      upcomingEvents,
      recentActivities,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
