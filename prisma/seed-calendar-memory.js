const { PrismaClient, MemorySource, EventType, TaskStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Calendar and Memory data...');

  // Create or get user
  let user = await prisma.user.findFirst({
    where: { email: 'gordon@example.com' },
  });

  if (!user) {
    user = await prisma.user.create({
      email: 'gordon@example.com',
      name: 'Gordon',
    });
    console.log('👤 Created user:', user.name);
  } else {
    console.log('👤 Found existing user:', user.name);
  }

  const userId = user.id;
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Create calendar events
  console.log('📅 Creating calendar events...');
  const events = [
    {
      title: 'Team Sync Meeting',
      description: 'Weekly team sync to discuss progress and blockers.',
      eventType: EventType.RECURRING,
      cronExpr: '0 9 * * 1', // Every Monday at 9 AM
      enabled: true,
      startAt: now,
      nextRunAt: oneDayLater,
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
      nextRunAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
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

  for (const eventData of events) {
    const existing = await prisma.event.findFirst({
      where: { title: eventData.title, createdBy: userId },
    });

    if (!existing) {
      const event = await prisma.event.create({ data: eventData });
      console.log(`  ✅ Created event: ${event.title}`);
      console.log(`     - Type: ${event.eventType}`);
      console.log(`     - Next run: ${event.nextRunAt ? event.nextRunAt.toISOString() : 'N/A'}`);
    } else {
      console.log(`  ⏭ Skipping existing event: ${existing.title}`);
    }
  }

  // Create memories (manual + from auto-hooks)
  console.log('🧠 Creating memories...');
  const memories = [
    {
      title: 'Project Architecture',
      content: `# Project Architecture

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript 5, Tailwind CSS
- **Backend**: Node.js 20, Prisma ORM, PostgreSQL 16
- **Worker**: Custom Node.js worker with cron scheduling

## Database Schema
- **Users**: System users and executors
- **Agents**: AI agents that can execute tasks
- **Tasks**: Kanban board tasks with drag-and-drop
- **TaskColumns**: Configurable board columns
- **Events**: Calendar events with cron scheduling
- **Runs**: Execution history for cron jobs
- **Memories**: Full-text searchable memory library
- **Activity**: Audit trail for all operations

## Key Features
1. **Full-Text Search**: PostgreSQL tsvector for memories
2. **Cron Scheduling**: Worker process with DB locking
3. **Auto-Memory Hooks**: Task done / Run finished → Create memory
4. **Global Search**: Cross-module search (tasks/events/memories)
5. **UUID Primary Keys**: All tables use PostgreSQL UUID
6. **JSONb Artifacts**: Flexible storage for all entities

## Deployment
\`\`\`bash
npx prisma db push --accept-data-loss
npx prisma generate
npx tsx scripts/worker.ts
\`\`\``,
      summary: 'Complete Mission Control project architecture documentation.',
      source: MemorySource.MANUAL,
      tags: ['architecture', 'documentation', 'project'],
      createdBy: userId,
    },
    {
      title: 'Next.js App Router Best Practices',
      content: `# App Router Best Practices

## File Structure
\`\`\`
src/app/
├── (dashboard)/page.tsx
├── tasks/
│   ├── page.tsx
│   └── actions.ts
├── calendar/
│   ├── page.tsx
│   └── actions.ts
├── memory/
│   ├── page.tsx
│   └── actions.ts
└── api/
    ├── tasks/[id]/route.ts
    └── ...
\`\`\`

## Server Actions
Server Actions should be defined in \`actions.ts\` files within route groups.

\`\`\`ts
'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function createTask(data: CreateTaskInput) {
  const task = await prisma.task.create({ data });
  revalidatePath('/tasks');
  return task;
}
\`\`\`

## Error Handling
Always use try-catch in Server Actions and return consistent error responses.

\`\`\`ts
try {
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}
\`\`\``,
      summary: 'Best practices for Next.js App Router with Server Actions.',
      source: MemorySource.MANUAL,
      tags: ['nextjs', 'app-router', 'best-practices', 'tutorial'],
      createdBy: userId,
    },
    {
      title: 'Worker Process Design',
      content: `# Worker Process Design

## Purpose
Background worker to execute cron-scheduled events and run periodic tasks.

## Key Features

### 1. Polling Loop
- Polls every 60 seconds
- Uses \`SELECT ... FOR UPDATE SKIP LOCKED\` for idempotency
- Prevents double execution

### 2. Execution Flow
1. Find due cron events
2. Create run record (status=running)
3. Log activity (run_started)
4. Execute job logic
5. Update run (success/failed)
6. Log activity (run_finished/failed)
7. Auto-generate memory (if success)
8. Compute next run time

### 3. Locking Strategy
\`\`\`sql
SELECT * FROM events
WHERE enabled = true
  AND next_run_at <= NOW()
  AND event_type = 'RECURRING'
FOR UPDATE SKIP LOCKED
\`\`\`

This ensures that:
- Only one worker instance picks up each event
- No duplicate executions
- Workers are resilient to failures

### 4. Graceful Shutdown
\`\`\`ts
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down worker...');
  await prisma.$disconnect();
  process.exit(0);
});
\`\`\`

### 5. Cron Parser
Simplified cron parser for demonstration:
\`\`\`"minute hour * * *"\`\`\`

For production, use a proper library like \`node-cron\` or \`cron-parser\`.

## Running the Worker
\`\`\`bash
npm run worker
# or
npx tsx scripts/worker.ts
\`\`\``,
      summary: 'Worker process design with DB locking and idempotency.',
      source: MemorySource.MANUAL,
      tags: ['worker', 'cron', 'scheduling', 'locking', 'postgresql'],
      createdBy: userId,
    },
  ];

  for (const memoryData of memories) {
    const existing = await prisma.memory.findFirst({
      where: { title: memoryData.title, createdBy: userId },
    });

    if (!existing) {
      const memory = await prisma.memory.create({ data: memoryData });
      console.log(`  ✅ Created memory: ${memory.title}`);
      console.log(`     - Source: ${memory.source}`);
      console.log(`     - Tags: ${memory.tags.join(', ')}`);
    } else {
      console.log(`  ⏭ Skipping existing memory: ${existing.title}`);
    }
  }

  console.log(`✅ Seed completed!`);
  console.log(`   - Created ${events.length} calendar events`);
  console.log(`   - Created ${memories.length} memories`);
  console.log(`   - 3 recurring events with cron schedules`);
  console.log(`   - 1 one-time event`);
  console.log(`   - 3 manual memories`);
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
