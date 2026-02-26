import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEvents } from '@/app/calendar/actions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType') as 'ONE_TIME' | 'RECURRING' | undefined;
    const enabled = searchParams.get('enabled') as string | undefined;
    const fromDate = searchParams.get('fromDate') as string | undefined;
    const toDate = searchParams.get('toDate') as string | undefined;

    const events = await getEvents({
      eventType,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error instanceof Error ? error.message : 'Unknown error' },
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
        const result = await import('@/app/calendar/actions').then(m => m.createEvent(data));
        return NextResponse.json(result);
      }
      case 'update': {
        const result = await import('@/app/calendar/actions').then(m => m.updateEvent(data.id, data, data.performedBy));
        return NextResponse.json(result);
      }
      case 'delete': {
        const result = await import('@/app/calendar/actions').then(m => m.deleteEvent(data.id, data.performedBy));
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
