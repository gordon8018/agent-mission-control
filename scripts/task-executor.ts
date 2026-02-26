#!/usr/bin/env tsx
/**
 * Mission Control Task Executor
 * 自动执行分配给 agent 的任务
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://hft_user:hft_password@localhost:5432/hft_trading?schema=mission_control',
    },
  },
});

interface AgentTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  agentName: string;
  agentId: string;
  columnId: string;
}

/**
 * 获取分配给 agent 的待处理任务
 */
async function getAgentTasks(): Promise<AgentTask[]> {
  const tasks = await prisma.task.findMany({
    where: {
      status: {
        in: ['OPEN', 'IN_PROGRESS'],
      },
      assignedToAgentId: {
        not: null,
      },
    },
    include: {
      assignedToAgent: true,
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    agentName: task.assignedToAgent!.name,
    agentId: task.assignedToAgent!.id,
    columnId: task.columnId,
  }));
}

/**
 * 获取可用的列（根据状态）
 */
async function getColumnForStatus(status: string) {
  const columns = await prisma.taskColumn.findMany({
    orderBy: { position: 'asc' },
  });

  // 简单的映射逻辑
  if (status === 'DONE') {
    return columns.find((c) => c.name.toLowerCase().includes('done') || c.name.includes('完成'));
  } else if (status === 'IN_PROGRESS') {
    return columns.find((c) => c.name.toLowerCase().includes('progress') || c.name.includes('进行中'));
  }

  return columns[0]; // 默认第一列
}

/**
 * 更新任务状态和列
 */
async function updateTask(taskId: string, status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED') {
  const column = await getColumnForStatus(status);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      columnId: column?.id,
      ...(status === 'DONE' ? { completedAt: new Date() } : {}),
      ...(status === 'IN_PROGRESS' ? { startedAt: new Date() } : {}),
    },
    include: {
      assignedToAgent: true,
    },
  });

  // 创建活动日志
  await prisma.activity.create({
    data: {
      entityType: 'Task',
      entityId: taskId,
      action: 'STATUS_CHANGE',
      performedBy: task.assignedToAgent?.name || 'system',
      changes: {
        status,
        column: column?.name,
      },
    },
  });

  return task;
}

/**
 * 主函数：处理 agent 任务
 */
async function processAgentTasks() {
  console.log('🤖 处理 Agent 任务...\n');

  const tasks = await getAgentTasks();

  if (tasks.length === 0) {
    console.log('✅ 没有待处理的 agent 任务');
    return { processed: 0, tasks: [] };
  }

  console.log(`📋 找到 ${tasks.length} 个 agent 任务：\n`);

  // 按优先级分组
  const urgent = tasks.filter((t) => t.priority === 'URGENT');
  const high = tasks.filter((t) => t.priority === 'HIGH');
  const medium = tasks.filter((t) => t.priority === 'MEDIUM');
  const low = tasks.filter((t) => t.priority === 'LOW');

  if (urgent.length > 0) {
    console.log(`🔴 紧急任务 (${urgent.length}):`);
    urgent.forEach((t) => console.log(`  - ${t.title} [${t.agentName}]`));
  }

  if (high.length > 0) {
    console.log(`🟠 高优先级任务 (${high.length}):`);
    high.forEach((t) => console.log(`  - ${t.title} [${t.agentName}]`));
  }

  if (medium.length > 0) {
    console.log(`🟡 中优先级任务 (${medium.length}):`);
    medium.forEach((t) => console.log(`  - ${t.title} [${t.agentName}]`));
  }

  if (low.length > 0) {
    console.log(`🟢 低优先级任务 (${low.length}):`);
    low.forEach((t) => console.log(`  - ${t.title} [${t.agentName}]`));
  }

  console.log(`\n📊 任务摘要：`);
  console.log(`  - 紧急: ${urgent.length}`);
  console.log(`  - 高: ${high.length}`);
  console.log(`  - 中: ${medium.length}`);
  console.log(`  - 低: ${low.length}`);

  return {
    processed: tasks.length,
    tasks,
    summary: {
      urgent: urgent.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
    },
  };
}

/**
 * 执行单个任务
 * 这个函数可以被扩展来实际执行任务逻辑
 */
async function executeTask(taskId: string) {
  console.log(`\n🚀 开始执行任务: ${taskId}`);

  try {
    // 标记为进行中
    await updateTask(taskId, 'IN_PROGRESS');

    // TODO: 这里可以添加实际的任务执行逻辑
    // 例如：调用 OpenClaw 的 sessions_spawn 来执行任务

    // 模拟任务执行
    console.log('⏳ 任务执行中...');

    // 标记为完成
    await updateTask(taskId, 'DONE');

    console.log('✅ 任务执行完成\n');
    return true;
  } catch (error) {
    console.error('❌ 任务执行失败:', error);
    // 标记为阻塞
    await updateTask(taskId, 'BLOCKED');
    return false;
  }
}

// 导出函数
export {
  getAgentTasks,
  updateTask,
  processAgentTasks,
  executeTask,
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  processAgentTasks()
    .then((result) => {
      console.log(`\n✨ 任务检查完成，共 ${result.processed} 个待处理任务`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 错误:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
