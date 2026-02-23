const { PrismaClient, EventType } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with calendar events...');

  // Get or create a demo user
  let user = await prisma.user.findFirst({
    where: { email: 'gordon@example.com' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'gordon@example.com',
        name: 'Gordon',
      },
    });
    console.log('👤 Created user:', user.name);
  } else {
    console.log('👤 Found existing user:', user.name);
  }

  const userId = user.id;
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneDayAt9am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
  if (oneDayAt9am <= now) {
    oneDayAt9am.setDate(oneDayAt9am.getDate() + 1);
  }

  // Create sample events
  const events = [
    {
      title: 'Team Sync Meeting',
      description: 'Weekly team sync to discuss progress and blockers.',
      eventType: EventType.RECURRING,
      cronExpr: '0 9 * * 1', // Every Monday at 9 AM
      enabled: true,
      startAt: now,
      nextRunAt: oneDayAt9am,
      createdBy: userId,
    },
    {
      title: 'Daily Standup',
      description: 'Daily standup meeting with the team.',
      eventType: EventType.RECURRING,
      cronExpr: '0 9 * * *', // Every day at 9 AM
      enabled: true,
      startAt: now,
      nextRunAt: oneHourLater,
      createdBy: userId,
    },
    {
      title: 'Code Review Session',
      description: 'Weekly code review session.',
      eventType: EventType.RECURRING,
      cronExpr: '0 14 * * 5', // Every Friday at 2 PM
      enabled: true,
      startAt: now,
      nextRunAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now (Friday)
      createdBy: userId,
    },
    {
      title: 'Project Deadline Review',
      description: 'Review upcoming project deadlines.',
      eventType: EventType.ONE_TIME,
      startAt: oneDayLater,
      createdBy: userId,
    },
  ];

  console.log('📅 Creating events...');
  for (const eventData of events) {
    // Check if event already exists
    const existing = await prisma.event.findFirst({
      where: {
        title: eventData.title,
        createdBy: userId,
      },
    });

    if (existing) {
      console.log(`  ⏭ Skipping existing event: ${eventData.title}`);
      continue;
    }

    const event = await prisma.event.create({
      data: eventData,
    });

    console.log(`  ✅ Created event: ${event.title}`);
    console.log(`     - Type: ${event.eventType}`);
    console.log(`     - Next run: ${event.nextRunAt ? event.nextRunAt.toISOString() : 'N/A'}`);
  }

  console.log(`✅ Seed completed!`);
  console.log(`   - Created ${events.length} calendar events`);
  console.log(`   - 3 recurring events with cron schedules`);
  console.log(`   - 1 one-time event`);
  console.log(`   - Worker will execute cron events automatically`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
