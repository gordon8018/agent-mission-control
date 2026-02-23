import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Poll interval in milliseconds (60 seconds)
const POLL_INTERVAL = 60000;

// Helper: Compute next run time from cron expression
function computeNextRunAt(cronExpr: string, from: Date = new Date()): Date | null {
  // Simplified cron parser: "minute hour * * *"
  // TODO: Use proper cron parser like node-cron or cron-parser
  if (!cronExpr) return null;

  const parts = cronExpr.split(' ');
  if (parts.length < 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const nextRun = new Date(from);

  // Parse minute
  if (minute !== '*') {
    const minuteNum = parseInt(minute);
    if (!isNaN(minuteNum)) {
      nextRun.setMinutes(minuteNum);
    }
  }

  // Parse hour
  if (hour !== '*') {
    const hourNum = parseInt(hour);
    if (!isNaN(hourNum)) {
      nextRun.setHours(hourNum);
      nextRun.setMinutes(0);
    }
  }

  // If next run is in the past, add a day (or hour, etc.)
  if (nextRun <= from) {
    if (hour === '*') {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0);
      nextRun.setMinutes(0);
    } else {
      nextRun.setHours(nextRun.getHours() + 1);
    }
  }

  return nextRun;
}

// Helper: Create activity log
async function logActivity(params: {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  message: string;
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

// Process a single cron event with locking
async function processCronEvent(eventId: string) {
  const now = new Date();

  // Use SELECT FOR UPDATE SKIP LOCKED to prevent concurrent processing
  const events = await prisma.$queryRaw`
    SELECT * FROM events
    WHERE id = ${eventId}
      AND enabled = true
      AND nextRunAt <= ${now}
      AND eventType = 'RECURRING'
    FOR UPDATE SKIP LOCKED
  ` as any[];

  if (events.length === 0) {
    // Either event doesn't exist, not enabled, or already processed
    return { processed: false, reason: 'not_due_or_locked' };
  }

  const eventData = events[0];

  console.log(`⚡ Processing cron event: ${eventData.title}`);

  // Create run record
  const run = await prisma.run.create({
    data: {
      eventId: eventData.id,
      status: 'RUNNING',
      startedAt: now,
      executedByUserId: 'system-worker', // Worker user
    },
  });

  // Log activity: run_started
  await logActivity({
    entityType: 'run',
    entityId: run.id,
    action: 'create',
    performedBy: 'system-worker',
    message: `Started run for event "${eventData.title}"`,
    diff: {
      eventId: eventData.id,
      cronExpr: eventData.cronExpr,
      runId: run.id,
    },
  });

  // Execute placeholder job logic
  // TODO: Replace with actual job execution
  const isSuccess = Math.random() > 0.1; // 90% success rate
  const output = `Executed event "${eventData.title}" at ${now.toISOString()}`;

  const completedAt = new Date();
  const status = isSuccess ? 'SUCCESS' : 'FAILED';

  let error = null;
  if (!isSuccess) {
    error = `Simulated failure for run ${run.id}`;
  }

  // Update run
  await prisma.run.update({
    where: { id: run.id },
    data: {
      status,
      completedAt,
      output,
      error,
      artifacts: {
        workerId: 'cron-worker-1',
        workerType: 'node',
        executionTime: completedAt.getTime() - now.getTime(),
      },
    },
  });

  // Log activity: run_finished or run_failed
  await logActivity({
    entityType: 'run',
    entityId: run.id,
    action: status === 'SUCCESS' ? 'run_finished' : 'run_failed',
    performedBy: 'system-worker',
    message: `${status === 'SUCCESS' ? 'Completed' : 'Failed'} run for event "${eventData.title}"`,
    diff: {
      eventId: eventData.id,
      cronExpr: eventData.cronExpr,
      status,
      duration: completedAt.getTime() - now.getTime(),
    },
  });

  // Auto-generate memory for finished run
  if (status === 'SUCCESS') {
    try {
      const { generateRunFinishedMemory } = await import('../memory/actions');
      await generateRunFinishedMemory(run.id, 'system-worker');
    } catch (error) {
      console.error('Failed to auto-generate memory for finished run:', error);
    }
  }

  // Compute and update next run time
  const nextRunAt = computeNextRunAt(eventData.cronExpr!, now);

  // Update event with next run time
  await prisma.event.update({
    where: { id: eventData.id },
    data: {
      nextRunAt,
    },
  });

  console.log(`✅ ${status} - ${eventData.title} - Next run: ${nextRunAt?.toISOString()}`);

  return { processed: true, runId: run.id, status };
}

// Main worker loop
async function checkAndExecuteDueEvents() {
  console.log('🔍 Checking for due cron events...');

  const now = new Date();

  try {
    // Find all enabled cron events that are due
    const events = await prisma.event.findMany({
      where: {
        enabled: true,
        eventType: 'RECURRING',
        nextRunAt: { lte: now },
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        nextRunAt: 'asc',
      },
    });

    console.log(`📊 Found ${events.length} due events`);

    // Process each event (with locking at individual event level)
    const results = [];
    for (const event of events) {
      const result = await processCronEvent(event.id);
      results.push({
        eventId: event.id,
        title: event.title,
        ...result,
      });
    }

    return results;
  } catch (error) {
    console.error('❌ Error executing events:', error);
    throw error;
  }
}

async function startWorker() {
  console.log('🚀 Mission Control Cron Worker started');
  console.log(`📊 Polling every ${POLL_INTERVAL / 1000}s`);
  console.log('🔐 Using DB locking for idempotency');

  // Initial check
  await checkAndExecuteDueEvents();

  // Set up interval
  setInterval(async () => {
    await checkAndExecuteDueEvents();
  }, POLL_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down worker...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down worker...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

startWorker().catch((error) => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
});
