const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🤖 Seeding database with agents...');

  // Create or get a demo user
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

  // Create sample agents
  const agents = [
    {
      name: 'code_master',
      role: 'developer',
      capabilities: ['code', 'debug', 'review'],
      status: 'idle',
      createdBy: userId,
    },
    {
      name: 'review_bot_1',
      role: 'reviewer',
      capabilities: ['review', 'code', 'test'],
      status: 'idle',
      createdBy: userId,
    },
    {
      name: 'test_runner',
      role: 'tester',
      capabilities: ['test', 'debug', 'documentation'],
      status: 'idle',
      createdBy: userId,
    },
    {
      name: 'deploy_agent',
      role: 'deployer',
      capabilities: ['deploy', 'monitor', 'rollback'],
      status: 'idle',
      createdBy: userId,
    },
    {
      name: 'documentation_bot',
      role: 'agent',
      capabilities: ['documentation', 'search', 'summarize'],
      status: 'idle',
      createdBy: userId,
    },
    {
      name: 'system_monitor',
      role: 'admin',
      capabilities: ['monitor', 'restart', 'configure'],
      status: 'busy',
      createdBy: userId,
    },
  ];

  console.log('🤖 Creating agents...');
  for (const agentData of agents) {
    const existing = await prisma.agent.findFirst({
      where: { name: agentData.name },
    });

    if (!existing) {
      const agent = await prisma.agent.create({
        data: agentData,
      });

      console.log(`  ✅ Created agent: ${agent.name}`);
      console.log(`     - Role: ${agent.role}`);
      console.log(`     - Status: ${agent.status}`);
      console.log(`     - Capabilities: ${agentData.capabilities.join(', ')}`);

      // Create some fake assigned tasks for system_monitor
      if (agent.name === 'system_monitor') {
        const taskColumn = await prisma.taskColumn.findFirst({
          where: { name: 'In Progress' },
        });

        if (taskColumn) {
          const maxPositionTask = await prisma.task.findFirst({
            where: { columnId: taskColumn.id },
            orderBy: { position: 'desc' },
          });

          const position = (maxPositionTask?.position ?? 0) + 1;

          await prisma.task.create({
            data: {
              title: 'Monitor system health',
              description: 'Check server status, database connections, and agent health.',
              columnId: taskColumn.id,
              position,
              priority: 'HIGH',
              status: 'IN_PROGRESS',
              assignedToAgentId: agent.id,
              createdById: userId,
            },
          });

          console.log(`     - Assigned task: "Monitor system health"`);
        }
      }
    } else {
      console.log(`  ⏭ Skipping existing agent: ${existing.name}`);
    }
  }

  console.log(`✅ Seed completed!`);
  console.log(`   - Created ${agents.length} agents`);
  console.log(`   - Roles: developer, reviewer, tester, deployer, admin`);
  console.log(`   - Capabilities: code, review, debug, test, deploy, monitor, documentation`);
  console.log(`   - System monitor is busy with assigned task`);
  console.log(`   - All agents ready to be assigned tasks`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
