#!/usr/bin/env tsx
/**
 * Mission Control Task Manager
 * 定时检查和处理待完成的任务
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://hft_user:hft_password@localhost:5432/hft_trading?schema=mission_control',
    },
  },
});

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo: string;
  type: 'agent' | 'user';
  dueDate?: Date;
}

/**
 * 检查并获取待处理的任务
 */
async function getPendingTasks(): Promise<TaskSummary[]> {
  const tasks = await prisma.task.findMany({
    where: {
      status: {
        in: ['OPEN', 'IN_PROGRESS'],
      },
      OR: [
        { assignedToAgentId: { not: null } },
        { assignedToUserId: { not: null } },
      ],
    },
    include: {
      assignedToAgent: true,
      assignedToUser: true,
      column: true,
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedToAgent?.name || task.assignedToUser?.email || '未分配',
    type: task.assignedToAgentId ? 'agent' : 'user',
    dueDate: task.dueDate || undefined,
  }));
}

/**
 * 获取 agent 信息
 */
async function getAgentByName(name: string) {
  return await prisma.agent.findUnique({
    where: { name },
  });
}

/**
 * 更新任务状态
 */
async function updateTaskStatus(
  taskId: string,
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED',
  completedAt?: Date
) {
  const updateData: any = { status };
  if (completedAt) {
    updateData.completedAt = completedAt;
  }

  return await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });
}

/**
 * 创建活动日志
 */
async function createActivity(
  entityType: string,
  entityId: string,
  action: string,
  performedBy: string,
  changes?: any
) {
  // 找到用户或 agent
  const user = await prisma.user.findFirst({
    where: { email: performedBy },
  });

  const performedById = user?.id || performedBy;

  return await prisma.activity.create({
    data: {
      entityType,
      entityId,
      action,
      performedBy: performedById,
      changes,
    },
  });
}

/**
 * 主函数：检查并处理任务
 */
async function checkAndProcessTasks() {
  console.log('🔍 检查 Mission Control 待完成任务...\n');

  const tasks = await getPendingTasks();

  if (tasks.length === 0) {
    console.log('✅ 没有待处理的任务');
    return [];
  }

  console.log(`📋 找到 ${tasks.length} 个待处理任务：\n`);

  // 按类型分组
  const agentTasks = tasks.filter((t) => t.type === 'agent');
  const userTasks = tasks.filter((t) => t.type === 'user');

  // 显示 agent 任务
  if (agentTasks.length > 0) {
    console.log(`🤖 分配给 Agent 的任务 (${agentTasks.length})：`);
    agentTasks.forEach((task, i) => {
      const dueInfo = task.dueDate
        ? ` | ⏰ 截止: ${task.dueDate.toLocaleString('zh-CN')}`
        : '';
      console.log(
        `  ${i + 1}. [${task.priority}] ${task.title} (${task.status})${dueInfo}`
      );
    });
    console.log('');
  }

  // 显示用户任务
  if (userTasks.length > 0) {
    console.log(`👤 分配给用户的任务 (${userTasks.length})：`);
    userTasks.forEach((task, i) => {
      const dueInfo = task.dueDate
        ? ` | ⏰ 截止: ${task.dueDate.toLocaleString('zh-CN')}`
        : '';
      console.log(
        `  ${i + 1}. [${task.priority}] ${task.title} → ${task.assignedTo} (${task.status})${dueInfo}`
      );
    });
    console.log('');
  }

  // 检查截止日期临近的任务
  const now = new Date();
  const soonDue = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const hoursLeft = (t.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 24;
  });

  if (soonDue.length > 0) {
    console.log(`⚠️  即将到期的任务 (${soonDue.length})：`);
    soonDue.forEach((task) => {
      const hoursLeft = Math.round(
        (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      console.log(`  - ${task.title} (还剩 ${hoursLeft} 小时)`);
    });
    console.log('');
  }

  return tasks;
}

/**
 * 标记任务为进行中
 */
async function markTaskInProgress(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
    include: {
      assignedToAgent: true,
    },
  });

  await createActivity(
    'Task',
    taskId,
    'STATUS_CHANGE',
    task.assignedToAgent?.name || 'system',
    {
      from: task.status,
      to: 'IN_PROGRESS',
    }
  );

  console.log(`✅ 任务 "${task.title}" 已标记为进行中`);
  return task;
}

/**
 * 标记任务为完成
 */
async function markTaskCompleted(taskId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'DONE',
      completedAt: new Date(),
    },
    include: {
      assignedToAgent: true,
    },
  });

  await createActivity(
    'Task',
    taskId,
    'STATUS_CHANGE',
    task.assignedToAgent?.name || 'system',
    {
      from: task.status,
      to: 'DONE',
    }
  );

  console.log(`✅ 任务 "${task.title}" 已完成`);
  return task;
}

/**
 * 获取任务详情
 */
async function getTaskDetail(taskId: string) {
  return await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedToAgent: true,
      assignedToUser: true,
      column: true,
      memories: true,
    },
  });
}

// 导出函数供其他脚本使用
export {
  getPendingTasks,
  updateTaskStatus,
  markTaskInProgress,
  markTaskCompleted,
  getTaskDetail,
  createActivity,
  checkAndProcessTasks,
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndProcessTasks()
    .then((tasks) => {
      console.log(`\n✨ 任务检查完成`);
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
