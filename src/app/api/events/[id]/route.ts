import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runs = await prisma.run.findMany({
      where: { eventId: id },
      include: {
        executedByAgent: { select: { id: true, name: true, status: true } },
        executedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error('Failed to fetch runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { action, performedBy, ...data } = body;

    switch (action) {
      case 'trigger': {
        // Manually trigger an event (create run)
        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) {
          return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // TODO: Use DB lock strategy here
        const run = await prisma.run.create({
          data: {
            eventId: event.id,
            status: 'RUNNING',
            startedAt: new Date(),
            executedByUserId: performedBy, // Triggered by user
          },
        });

        // Log activity
        await prisma.activity.create({
          data: {
            entityType: 'run',
            entityId: run.id,
            action: 'create',
            performedBy,
            changes: {
              message: `Triggered event "${event.title}"`,
              eventId: event.id,
              runId: run.id,
              triggeredBy: performedBy,
            },
          },
        });

        // Update event next run time if cron
        if (event.eventType === 'RECURRING' && event.cronExpr) {
          // TODO: Compute next run time
        }

        return NextResponse.json({ success: true, run });
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
