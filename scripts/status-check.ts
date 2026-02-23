#!/usr/bin/env tsx
/**
 * Mission Control Status Check
 * 检查服务状态和依赖项
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://hft_user:hft_password@localhost:5432/hft_trading?schema=mission_control',
    },
  },
});

/**
 * 检查开发服务器状态
 */
async function checkDevServer() {
  console.log('🔍 检查开发服务器状态...');

  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      console.log('✅ 开发服务器运行正常 (http://localhost:3000)');
      return true;
    } else {
      console.log(`⚠️  开发服务器响应异常: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ 开发服务器未运行');
    console.log('   提示: 运行 `cd /Users/gordonyang/.openclaw/workspace-code/mission-control && npm run dev`');
    return false;
  }
}

/**
 * 检查数据库连接
 */
async function checkDatabase() {
  console.log('\n🔍 检查数据库连接...');

  try {
    await prisma.$connect();
    const count = await prisma.task.count();
    console.log(`✅ 数据库连接正常 (共有 ${count} 个任务)`);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('❌ 数据库连接失败');
    console.log('   错误:', error instanceof Error ? error.message : '未知错误');
    await prisma.$disconnect();
    return false;
  }
}

/**
 * 检查 Node.js 依赖项
 */
async function checkDependencies() {
  console.log('\n🔍 检查关键依赖项...');

  const dependencies = [
    'next',
    'react',
    '@prisma/client',
    'autoprefixer',
  ];

  let allOk = true;

  for (const dep of dependencies) {
    try {
      require.resolve(dep);
      console.log(`✅ ${dep} 已安装`);
    } catch (error) {
      console.log(`❌ ${dep} 未安装`);
      allOk = false;
    }
  }

  return allOk;
}

/**
 * 检查任务脚本
 */
async function checkTaskScripts() {
  console.log('\n🔍 检查任务脚本...');

  const fs = await import('fs');
  const path = await import('path');

  const scripts = [
    'task-manager.ts',
    'task-executor.ts',
  ];

  let allOk = true;

  for (const script of scripts) {
    const scriptPath = path.join(process.cwd(), 'scripts', script);
    if (fs.existsSync(scriptPath)) {
      console.log(`✅ ${script} 存在`);
    } else {
      console.log(`❌ ${script} 不存在`);
      allOk = false;
    }
  }

  return allOk;
}

/**
 * 获取系统摘要
 */
async function getSystemSummary() {
  console.log('\n📊 系统摘要：\n');

  // 统计任务
  const tasks = await prisma.task.groupBy({
    by: ['status', 'priority'],
    _count: {
      id: true,
    },
  });

  console.log('任务统计：');
  tasks.forEach((group) => {
    const statusEmoji = {
      OPEN: '📋',
      IN_PROGRESS: '🔄',
      DONE: '✅',
      BLOCKED: '⛔',
    } as const;

    const priorityEmoji = {
      LOW: '🟢',
      MEDIUM: '🟡',
      HIGH: '🟠',
      URGENT: '🔴',
    } as const;

    const status = group.status as keyof typeof statusEmoji;
    const priority = group.priority as keyof typeof priorityEmoji;

    console.log(
      `  ${statusEmoji[status]} ${group.status} / ${priorityEmoji[priority]} ${group.priority}: ${group._count.id} 个`
    );
  });

  // 统计 Agent
  const agents = await prisma.agent.findMany({
    where: {
      status: {
        not: 'idle',
      },
    },
  });

  if (agents.length > 0) {
    console.log('\n活跃 Agents：');
    agents.forEach((agent) => {
      console.log(`  🤖 ${agent.name}: ${agent.status}`);
    });
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Mission Control 状态检查\n');
  console.log('=' .repeat(50));

  const serverOk = await checkDevServer();
  const dbOk = await checkDatabase();
  const depsOk = await checkDependencies();
  const scriptsOk = await checkTaskScripts();

  if (dbOk) {
    await getSystemSummary();
  }

  console.log('\n' + '='.repeat(50));

  const allOk = serverOk && dbOk && depsOk && scriptsOk;

  if (allOk) {
    console.log('\n✅ 所有检查通过！系统运行正常。\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分检查失败，请查看上面的详细信息。\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ 状态检查失败:', error);
  process.exit(1);
});
