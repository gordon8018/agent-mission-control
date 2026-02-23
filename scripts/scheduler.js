const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Poll interval in milliseconds (30 seconds)
const POLL_INTERVAL = 30000;

async function checkAndExecuteDueEvents() {
  console.log('🔍 Checking for due events...');

  const now = new Date();

  try {
    // Find recurring events (cron-based) that need to run
    const recurringEvents = await prisma.event.findMany({
      where: {
        eventType: 'recurring',
        cronExpr: { not: null },
      },
      include: {
        creator: true,
      },
    });

    // For now, we'll implement basic time-based checking
    // In production, use a proper cron parser like node-cron
    for (const event of recurringEvents) {
      // Check if there's a recent run (within the last minute)
      const recentRun = await prisma.run.findFirst({
        where: {
          eventId: event.id,
          status: { in: ['running', 'success', 'failed'] },
          startedAt: {
            gte: new Date(now.getTime() - 60000), // Last minute
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      if (!recentRun) {
        console.log(`⚡ Executing event: ${event.title}`);

        // Create a run record
        const run = await prisma.run.create({
          data: {
            eventId: event.id,
            status: 'running',
            startedAt: now,
          },
        });

        // Log activity
        await prisma.activity.create({
          data: {
            entityType: 'event',
            entityId: event.id,
            action: 'run',
            changes: {
              eventId: event.id,
              runId: run.id,
            },
            performedBy: event.createdBy,
          },
        });

        // Simulate execution (in production, this would execute actual work)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update run as successful
        await prisma.run.update({
          where: { id: run.id },
          data: {
            status: 'success',
            completedAt: new Date(),
            output: `Executed event: ${event.title}`,
          },
        });

        console.log(`✅ Completed event: ${event.title}`);
      }
    }

    // Find one-time events that are due
    const oneTimeEvents = await prisma.event.findMany({
      where: {
        eventType: 'one-time',
        startAt: { lte: now },
      },
      include: {
        runs: {
          where: { status: { in: ['running', 'success', 'failed'] } },
        },
      },
    });

    for (const event of oneTimeEvents) {
      if (event.runs.length === 0) {
        console.log(`⚡ Executing one-time event: ${event.title}`);

        const run = await prisma.run.create({
          data: {
            eventId: event.id,
            status: 'running',
            startedAt: now,
          },
        });

        await prisma.activity.create({
          data: {
            entityType: 'event',
            entityId: event.id,
            action: 'run',
            changes: { eventId: event.id, runId: run.id },
            performedBy: event.createdBy,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        await prisma.run.update({
          where: { id: run.id },
          data: {
            status: 'success',
            completedAt: new Date(),
            output: `Executed one-time event: ${event.title}`,
          },
        });

        console.log(`✅ Completed one-time event: ${event.title}`);
      }
    }
  } catch (error) {
    console.error('❌ Error executing events:', error);
  }
}

async function startScheduler() {
  console.log('🚀 Mission Control Scheduler started');
  console.log(`📊 Polling every ${POLL_INTERVAL / 1000}s`);

  // Initial check
  await checkAndExecuteDueEvents();

  // Set up interval
  setInterval(async () => {
    await checkAndExecuteDueEvents();
  }, POLL_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down scheduler...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down scheduler...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

startScheduler().catch((error) => {
  console.error('❌ Failed to start scheduler:', error);
  process.exit(1);
});
