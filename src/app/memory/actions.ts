'use server';

import { prisma } from '@/lib/prisma';
import { Prisma, MemorySource, TaskStatus, RunStatus } from '@prisma/client';
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

// CREATE MEMORY
export async function createMemory(data: {
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  source?: MemorySource;
  sourceRefId?: string;
  createdBy: string;
}) {
  const memory = await prisma.memory.create({
    data: {
      title: data.title,
      content: data.content,
      summary: data.summary,
      source: data.source || MemorySource.MANUAL,
      sourceRefId: data.sourceRefId,
      tags: data.tags || [],
      createdBy: data.createdBy,
    },
    include: {
      creator: { select: { id: true, name: true } },
      sourceTask: true,
      sourceRun: true,
    },
  });

  // Log activity
  await logActivity({
    entityType: 'memory',
    entityId: memory.id,
    action: 'create',
    performedBy: data.createdBy,
    message: `Created memory "${data.title}"`,
    diff: {
      title: data.title,
      source: data.source,
      sourceRefId: data.sourceRefId,
    },
  });

  revalidatePath('/memory');
  revalidatePath('/dashboard');
  return { success: true, memory };
}

// UPDATE MEMORY
export async function updateMemory(
  id: string,
  data: {
    title?: string;
    content?: string;
    summary?: string;
    tags?: string[];
  },
  performedBy: string
) {
  const oldMemory = await prisma.memory.findUnique({ where: { id } });
  if (!oldMemory) throw new Error('Memory not found');

  // Build diff
  const diff: Record<string, any> = {};
  if (data.title !== undefined && data.title !== oldMemory.title) diff.title = { from: oldMemory.title, to: data.title };
  if (data.content !== undefined) diff.content = { changed: true };
  if (data.summary !== undefined) diff.summary = { from: oldMemory.summary, to: data.summary };
  if (data.tags !== undefined) diff.tags = { from: oldMemory.tags, to: data.tags };

  const memory = await prisma.memory.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.tags !== undefined && { tags: data.tags }),
    },
    include: {
      creator: { select: { id: true, name: true } },
      sourceTask: true,
      sourceRun: true,
    },
  });

  // Log activity
  await logActivity({
    entityType: 'memory',
    entityId: id,
    action: 'update',
    performedBy,
    message: `Updated memory "${memory.title}"`,
    diff,
  });

  revalidatePath('/memory');
  return { success: true, memory };
}

// DELETE MEMORY
export async function deleteMemory(id: string, performedBy: string) {
  const memory = await prisma.memory.findUnique({ where: { id } });
  if (!memory) throw new Error('Memory not found');

  await prisma.memory.delete({ where: { id } });

  // Log activity
  await logActivity({
    entityType: 'memory',
    entityId: id,
    action: 'delete',
    performedBy,
    message: `Deleted memory "${memory.title}"`,
    diff: {
      title: memory.title,
      source: memory.source,
      sourceRefId: memory.sourceRefId,
    },
  });

  revalidatePath('/memory');
  return { success: true };
}

// SEARCH MEMORIES (FULL-TEXT)
export async function searchMemories(query: string) {
  // Use tsquery for full-text search
  const memories = await prisma.$queryRaw`
    SELECT
      m.id,
      m.title,
      m.content,
      m.summary,
      m.tags,
      m.source,
      m."taskSourceRefId",
      m."runSourceRefId",
      m."createdAt",
      c.name as "creatorName"
    FROM memories m
    LEFT JOIN users c ON m."createdBy" = c.id
    WHERE m.search_vector @@ to_tsquery('english', ${query})
    ORDER BY ts_rank(m.search_vector, to_tsquery('english', ${query})) DESC
    LIMIT 20
  ` as any[];

  return memories;
}

// GET MEMORIES WITH FILTERS
export async function getMemories(filters: {
  source?: MemorySource;
  sourceRefId?: string;
  tag?: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  const where: Prisma.MemoryWhereInput = {};

  if (filters.source) where.source = filters.source;
  if (filters.sourceRefId) where.sourceRefId = filters.sourceRefId;
  if (filters.fromDate) where.createdAt = { gte: filters.fromDate };
  if (filters.toDate) where.createdAt = { lte: filters.toDate };

  // Filter by tag (JSON contains)
  if (filters.tag) {
    where.tags = {
      has: filters.tag,
    };
  }

  const memories = await prisma.memory.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true } },
      sourceTask: { select: { id: true, title: true } },
      sourceRun: { select: { id: true, eventId: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return memories;
}

// AUTO-GENERATE MEMORY FOR TASK DONE
export async function generateTaskDoneMemory(taskId: string, performedBy: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: true,
      assignedToUser: { select: { id: true, name: true } },
      assignedToAgent: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!task) throw new Error('Task not found');

  // Generate memory title and content
  const title = `Task Completed: ${task.title}`;
  const content = `# Task Completed: ${task.title}

## Description
${task.description || 'No description provided'}

## Task Details
- **Column**: ${task.column.name}
- **Priority**: ${task.priority}
- **Status**: ${task.status}
- **Due Date**: ${task.dueDate ? task.dueDate.toISOString() : 'Not set'}
${task.assignedToUser ? `
## Assignee
- **User**: ${task.assignedToUser.name} (${task.assignedToUser.id})
` : ''}
${task.assignedToAgent ? `
## Assignee
- **Agent**: ${task.assignedToAgent.name} (${task.assignedToAgent.id})
` : ''}
## Completion
Completed on ${new Date().toISOString()}
`;

  const summary = `Task "${task.title}" completed in ${task.column.name} column.`;

  const memory = await prisma.memory.create({
    data: {
      title,
      content,
      summary,
      source: MemorySource.TASK_DONE,
      sourceRefId: taskId,
      tags: ['completed', 'task', task.column.name.toLowerCase()],
      createdBy: performedBy,
    },
  });

  // Log activity
  await logActivity({
    entityType: 'memory',
    entityId: memory.id,
    action: 'auto_create',
    performedBy,
    message: `Auto-created memory for completed task "${task.title}"`,
    diff: {
      taskId,
      memoryId: memory.id,
      source: MemorySource.TASK_DONE,
    },
  });

  return { success: true, memory };
}

// AUTO-GENERATE MEMORY FOR RUN FINISHED
export async function generateRunFinishedMemory(runId: string, performedBy: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      event: true,
      executedByAgent: { select: { id: true, name: true } },
      executedByUser: { select: { id: true, name: true } },
    },
  });

  if (!run) throw new Error('Run not found');

  // Generate memory title and content
  const title = `Run ${run.status}: ${run.event.title}`;
  const content = `# Run ${run.status}: ${run.event.title}

## Event Details
- **Title**: ${run.event.title}
- **Description**: ${run.event.description || 'No description'}
- **Event Type**: ${run.event.eventType}

## Run Details
- **Status**: ${run.status}
- **Started At**: ${run.startedAt.toISOString()}
${run.completedAt ? `
- **Completed At**: ${run.completedAt.toISOString()}
- **Duration**: ${Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 1000)} seconds
` : ''}
${run.executedByAgent ? `
## Executed By
- **Agent**: ${run.executedByAgent.name}
- **Agent Status**: ${run.executedByAgent.status}
` : ''}
${run.executedByUser ? `
## Executed By
- **User**: ${run.executedByUser.name}
` : ''}
## Output
${run.output || 'No output'}
${run.error ? `
## Error
${run.error}
` : ''}
`;

  const summary = `Run "${run.event.title}" finished with status: ${run.status}.`;

  const memory = await prisma.memory.create({
    data: {
      title,
      content,
      summary,
      source: MemorySource.RUN_FINISHED,
      sourceRefId: runId,
      tags: ['run', run.status.toLowerCase(), run.event.eventType.toLowerCase()],
      createdBy: performedBy,
    },
  });

  // Log activity
  await logActivity({
    entityType: 'memory',
    entityId: memory.id,
    action: 'auto_create',
    performedBy,
    message: `Auto-created memory for finished run "${run.event.title}"`,
    diff: {
      runId,
      memoryId: memory.id,
      status: run.status,
      source: MemorySource.RUN_FINISHED,
    },
  });

  return { success: true, memory };
}
