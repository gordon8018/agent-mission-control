const { PrismaClient, TaskPriority, TaskStatus } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to generate a UUID v4
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function main() {
  console.log('🌱 Seeding database with UUID-based schema...');

  // Create default task columns with UUIDs
  const columns = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Backlog', position: 1, color: '#64748b' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'To Do', position: 2, color: '#3b82f6' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'In Progress', position: 3, color: '#f59e0b' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Review', position: 4, color: '#8b5cf6' },
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Done', position: 5, color: '#10b981' },
  ];

  console.log('📋 Creating task columns...');
  for (const column of columns) {
    await prisma.taskColumn.upsert({
      where: { name: column.name },
      update: { color: column.color },
      create: column,
    });
  }

  // Create a demo user with UUID
  const userId = '550e8400-e29b-41d4-a716-446655440010';
  const user = await prisma.user.upsert({
    where: { email: 'gordon@example.com' },
    update: { id: userId },
    create: {
      id: userId,
      email: 'gordon@example.com',
      name: 'Gordon',
    },
  });
  console.log('👤 Created user:', user.name);

  // Create a demo agent with UUID
  const agentId = '550e8400-e29b-41d4-a716-446655440011';
  const agent = await prisma.agent.upsert({
    where: { name: 'code_master' },
    update: { id: agentId },
    create: {
      id: agentId,
      name: 'code_master',
      status: 'idle',
      config: {
        capabilities: ['code', 'debug', 'review'],
        model: 'zai/glm-4.7',
      },
    },
  });
  console.log('🤖 Created agent:', agent.name);

  // Get the Backlog column
  const backlog = await prisma.taskColumn.findUnique({
    where: { name: 'Backlog' },
  });

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...');
  await prisma.activity.deleteMany({});
  await prisma.memory.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.task.deleteMany({});

  // Create sample tasks with UUIDs and enum values
  if (backlog) {
    const tasks = [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        title: 'Welcome to Mission Control',
        description: 'This is your first task. Drag it to "To Do" to get started!',
        columnId: backlog.id,
        position: 1,
        priority: TaskPriority.LOW,
        status: TaskStatus.OPEN,
        createdById: userId,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440021',
        title: 'Review project requirements',
        description: 'Read through the project documentation and understand the requirements.',
        columnId: backlog.id,
        position: 2,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.OPEN,
        createdById: userId,
        assignedToUserId: userId, // Assigned to Gordon
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440022',
        title: 'Set up development environment',
        description: 'Install all necessary dependencies and configure the database.',
        columnId: backlog.id,
        position: 3,
        priority: TaskPriority.HIGH,
        status: TaskStatus.OPEN,
        createdById: userId,
        assignedToAgentId: agentId, // Assigned to code_master agent
      },
    ];

    console.log('📝 Creating sample tasks...');
    for (const task of tasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: {},
        create: task,
      });
    }

    // Create sample memory for full-text search testing
    const memoryId = '550e8400-e29b-41d4-a716-446655440030';
    await prisma.memory.upsert({
      where: { id: memoryId },
      update: {},
      create: {
        id: memoryId,
        title: 'Project Guidelines',
        content: 'Mission Control is a comprehensive task management system built with Next.js, TypeScript, and PostgreSQL. It features a Kanban board with drag-and-drop functionality, calendar integration with cron scheduling, a full-text searchable memory library, and real-time agent status tracking.',
        tags: ['guidelines', 'documentation', 'architecture'],
        metadata: {
          version: '0.2.0',
          lastUpdated: new Date().toISOString(),
          author: 'system',
        },
        createdBy: userId,
      },
    });
    console.log('🧠 Created sample memory for full-text search testing');

    // Create sample activity logs
    console.log('📊 Creating sample activity logs...');
    const activityLogs = [
      {
        id: '550e8400-e29b-41d4-a716-446655440040',
        entityType: 'task',
        entityId: tasks[0].id,
        action: 'create',
        changes: {
          title: tasks[0].title,
          columnId: backlog.id,
          priority: tasks[0].priority,
        },
        performedBy: userId,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440041',
        entityType: 'memory',
        entityId: memoryId,
        action: 'create',
        changes: {
          title: 'Project Guidelines',
          tags: ['guidelines', 'documentation'],
        },
        performedBy: userId,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440042',
        entityType: 'agent',
        entityId: agentId,
        action: 'register',
        changes: {
          name: agent.name,
          status: agent.status,
        },
        performedBy: userId,
      },
    ];

    for (const log of activityLogs) {
      await prisma.activity.upsert({
        where: { id: log.id },
        update: {},
        create: log,
      });
    }
  }

  // Create sample event
  console.log('📅 Creating sample event...');
  const eventId = '550e8400-e29b-41d4-a716-446655440050';
  await prisma.event.upsert({
    where: { id: eventId },
    update: {},
    create: {
      id: eventId,
      title: 'Weekly Team Sync',
      description: 'Weekly sync meeting to discuss project progress and blockers.',
      eventType: 'RECURRING',
      cronExpr: '0 9 * * 1', // Every Monday at 9 AM
      startAt: new Date(),
      createdBy: userId,
    },
  });

  console.log('✅ Seed completed!');
  console.log(`   - Created ${columns.length} task columns with UUIDs`);
  console.log(`   - Created user: ${user.name} (${user.email})`);
  console.log(`   - Created agent: ${agent.name}`);
  console.log(`   - Created 3 sample tasks`);
  console.log(`   - Created 1 sample memory (full-text search enabled)`);
  console.log(`   - Created 3 activity logs`);
  console.log(`   - Created 1 sample event`);
  console.log(`   - All IDs are UUID v4 format`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
