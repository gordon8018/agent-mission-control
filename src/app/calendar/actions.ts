'use server';

import { prisma } from '@/lib/prisma';
import { Prisma, EventType, RunStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Helper: Create activity log
async function logActivity(params: {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  message?: string;
  diff?: Record<string, any>;
}) {
  await prisma.activity.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      performedBy: params.performedBy,
      changes: {
        message: params.message,
        diff: params.diff,
      },
    },
  });
}

// Helper: Compute next run time from cron expression
function computeNextRunAt(cronExpr: string, from: Date = new Date()): Date | null {
  // This is a simplified implementation. In production, use a proper cron parser
  // For now, we'll compute it as: if cronExpr is set, schedule every hour
  // TODO: Use node-cron or cron-parser for proper cron calculation
  if (!cronExpr) return null;

  const minutes = cronExpr.split(' ')[0];
  const hours = cronExpr.split(' ')[1];

  // Parse cron format: minute hour * * * *
  const now = new Date(from);
  const nextRun = new Date(now);

  if (minutes !== '*') {
    nextRun.setMinutes(parseInt(minutes));
  }

  if (hours !== '*') {
    nextRun.setHours(parseInt(hours));
  }

  // If next run is in the past, add an hour
  if (nextRun <= now) {
    nextRun.setHours(nextRun.getHours() + 1);
  }

  return nextRun;
}

// CREATE EVENT
export async function createEvent(data: {
  title: string;
  description?: string;
  eventType: EventType;
  cronExpr?: string;
  startAt: Date;
  endAt?: Date;
  createdBy: string;
}) {
  const nextRunAt = data.eventType === EventType.RECURRING && data.cronExpr
    ? computeNextRunAt(data.cronExpr)
    : undefined;

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      eventType: data.eventType,
      cronExpr: data.cronExpr,
      enabled: true,
      nextRunAt,
      startAt: data.startAt,
      endAt: data.endAt,
      createdBy: data.createdBy,
    },
    include: {
      creator: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await logActivity({
    entityType: 'event',
    entityId: event.id,
    action: 'create',
    performedBy: data.createdBy,
    message: `Created event "${event.title}"`,
    diff: {
      title: data.title,
      eventType: data.eventType,
      cronExpr: data.cronExpr,
      startAt: data.startAt,
    },
  });

  revalidatePath('/calendar');
  return { success: true, event };
}

// UPDATE EVENT
export async function updateEvent(
  id: string,
  data: {
    title?: string;
    description?: string;
    eventType?: EventType;
    cronExpr?: string;
    enabled?: boolean;
    startAt?: Date;
    endAt?: Date;
  },
  performedBy: string
) {
  const oldEvent = await prisma.event.findUnique({ where: { id } });
  if (!oldEvent) throw new Error('Event not found');

  // Build diff
  const diff: Record<string, any> = {};
  if (data.title !== undefined && data.title !== oldEvent.title) diff.title = { from: oldEvent.title, to: data.title };
  if (data.eventType !== undefined && data.eventType !== oldEvent.eventType) diff.eventType = { from: oldEvent.eventType, to: data.eventType };
  if (data.cronExpr !== undefined) diff.cronExpr = { from: oldEvent.cronExpr, to: data.cronExpr };
  if (data.enabled !== undefined) diff.enabled = { from: oldEvent.enabled, to: data.enabled };
  if (data.startAt !== undefined) diff.startAt = { from: oldEvent.startAt, to: data.startAt };

  // Recompute next run time if cron expression or enabled status changed
  let nextRunAt = oldEvent.nextRunAt;
  if ((data.cronExpr !== undefined && data.cronExpr !== oldEvent.cronExpr) ||
      (data.eventType !== undefined && data.eventType === EventType.RECURRING) ||
      (data.enabled !== undefined && data.enabled)) {
    nextRunAt = (data.eventType || oldEvent.eventType) === EventType.RECURRING && (data.enabled !== false) && (data.cronExpr || oldEvent.cronExpr)
      ? computeNextRunAt(data.cronExpr || oldEvent.cronExpr!)
      : null;
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.eventType !== undefined && { eventType: data.eventType }),
      ...(data.cronExpr !== undefined && { cronExpr: data.cronExpr }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.startAt !== undefined && { startAt: data.startAt }),
      ...(data.endAt !== undefined && { endAt: data.endAt }),
      ...(nextRunAt !== undefined && { nextRunAt }),
    },
    include: {
      creator: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await logActivity({
    entityType: 'event',
    entityId: id,
    action: 'update',
    performedBy,
    message: `Updated event "${event.title}"`,
    diff,
  });

  revalidatePath('/calendar');
  return { success: true, event };
}

// DELETE EVENT
export async function deleteEvent(id: string, performedBy: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error('Event not found');

  await prisma.event.delete({ where: { id } });

  // Log activity
  await logActivity({
    entityType: 'event',
    entityId: id,
    action: 'delete',
    performedBy,
    message: `Deleted event "${event.title}"`,
    diff: {
      title: event.title,
      eventType: event.eventType,
      startAt: event.startAt,
    },
  });

  revalidatePath('/calendar');
  return { success: true };
}

// GET EVENTS WITH FILTERS
export async function getEvents(filters: {
  eventType?: EventType;
  enabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
}) {
  const where: Prisma.EventWhereInput = {};

  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.enabled !== undefined) where.enabled = filters.enabled;
  if (filters.fromDate) where.startAt = { gte: filters.fromDate };
  if (filters.toDate) where.startAt = { lte: filters.toDate };

  const events = await prisma.event.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true } },
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
    orderBy: { startAt: 'asc' },
  });

  return events;
}

// GET RUNS FOR EVENT
export async function getEventRuns(eventId: string) {
  const runs = await prisma.run.findMany({
    where: { eventId },
    include: {
      executedByAgent: { select: { id: true, name: true, status: true } },
      executedByUser: { select: { id: true, name: true } },
    },
    orderBy: { startedAt: 'desc' },
  });

  return runs;
}
