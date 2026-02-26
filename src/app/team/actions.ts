'use server';

import { prisma } from '@/lib/prisma';
import { OpenClawLinkStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { openClawProvider } from '@/lib/openclaw/httpProvider';
import { OpenClawNotFoundError } from '@/lib/openclaw/provider';

function isAdminUser(performedBy: string) {
  const configuredAdminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (configuredAdminIds.includes(performedBy)) return true;
  return performedBy.toLowerCase().includes('admin');
}

function assertAdmin(performedBy: string) {
  if (!isAdminUser(performedBy)) {
    throw new Error('Only Admin users can manage OpenClaw links');
  }
}

// CREATE AGENT
export async function createAgent(data: {
  name: string;
  role?: string;
  capabilities?: string[];
  config?: any;
  createdBy: string;
}) {
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      status: 'idle',
      config: {
        role: data.role || 'agent',
        capabilities: data.capabilities || ['code', 'review', 'debug'],
        ...data.config,
      },
      artifacts: {},
      createdBy: data.createdBy,
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      entityType: 'agent',
      entityId: agent.id,
      action: 'create',
      performedBy: data.createdBy,
      changes: {
        message: `Created agent "${agent.name}"`,
        diff: {
          name: data.name,
          role: data.role,
          capabilities: data.capabilities,
        },
      },
    },
  });

  revalidatePath('/team');
  return { success: true, agent };
}

// UPDATE AGENT
export async function updateAgent(
  id: string,
  data: {
    name?: string;
    role?: string;
    capabilities?: string[];
    status?: string;
    config?: any;
  },
  performedBy: string
) {
  const oldAgent = await prisma.agent.findUnique({ where: { id } });
  if (!oldAgent) throw new Error('Agent not found');

  const currentConfig = oldAgent.config as any;

  const agent = await prisma.agent.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.capabilities !== undefined && {
        config: {
          ...currentConfig,
          role: data.role || currentConfig.role,
          capabilities: data.capabilities,
        },
      }),
      ...(data.config !== undefined && {
        config: {
          ...currentConfig,
          ...data.config,
        },
      }),
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      entityType: 'agent',
      entityId: id,
      action: 'update',
      performedBy,
      changes: {
        message: `Updated agent "${agent.name}"`,
        diff: {
          name: data.name,
          role: data.role,
          status: data.status,
        },
      },
    },
  });

  revalidatePath('/team');
  return { success: true, agent };
}

// DELETE AGENT
export async function deleteAgent(id: string, performedBy: string) {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) throw new Error('Agent not found');

  await prisma.agent.delete({ where: { id } });

  // Log activity
  await prisma.activity.create({
    data: {
      entityType: 'agent',
      entityId: id,
      action: 'delete',
      performedBy,
      changes: {
        message: `Deleted agent "${agent.name}"`,
        diff: {
          name: agent.name,
          role: (agent.config as any)?.role,
        },
      },
    },
  });

  revalidatePath('/team');
  return { success: true };
}

// GET AGENTS
export async function getAgents(filters?: {
  role?: string;
  status?: string;
}) {
  const where: any = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.role) {
    where.config = {
      path: ['role'],
      equals: filters.role,
    };
  }

  const agents = await prisma.agent.findMany({
    where,
    include: {
      assignedTasks: {
        where: {
          status: { not: 'DONE' },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      executedRuns: {
        orderBy: { startedAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { name: 'asc' },
  });

  return agents;
}

// GET AGENT WITH ACTIVITIES
export async function getAgentWithActivities(id: string) {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      assignedTasks: {
        where: {
          status: { not: 'DONE' },
        },
        orderBy: { createdAt: 'desc' },
      },
      executedRuns: {
        orderBy: { startedAt: 'desc' },
      },
    },
  });

  if (!agent) throw new Error('Agent not found');

  return agent;
}

// GET AGENT ACTIVITIES
export async function getAgentActivities(id: string, limit = 10) {
  const activities = await prisma.activity.findMany({
    where: {
      entityType: 'agent',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return activities;
}

// ASSIGN TASK TO AGENT
export async function assignTaskToAgent(taskId: string, agentId: string, performedBy: string) {
  return await prisma.$transaction(async (tx) => {
    // Check if task exists
    const task = await tx.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if agent exists
    const agent = await tx.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check if agent already has a task assigned
    const existingTask = await tx.task.findFirst({
      where: { assignedToAgentId: agentId, status: { not: 'DONE' } },
    });

    if (existingTask && existingTask.id !== taskId) {
      throw new Error('Agent already has an active task');
    }

    // Update task - clear user assignee, set agent assignee
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        assignedToUserId: null, // Clear user assignment
        assignedToAgentId: agentId, // Set agent assignment
      },
      include: {
        assignedToAgent: true,
      },
    });

    // Log activity for task
    await tx.activity.create({
      data: {
        entityType: 'task',
        entityId: taskId,
        action: 'task.assigned',
        performedBy,
        changes: {
          message: `Assigned task "${task.title}" to agent "${agent.name}"`,
          diff: {
            taskId,
            taskTitle: task.title,
            agentId,
            agentName: agent.name,
            previousAssignee: task.assignedToUserId || task.assignedToAgentId,
          },
        },
      },
    });

    // Log activity for agent
    await tx.activity.create({
      data: {
        entityType: 'agent',
        entityId: agentId,
        action: 'agent.task_assigned',
        performedBy,
        changes: {
          message: `Task "${task.title}" assigned to agent`,
          diff: {
            taskId,
            taskTitle: task.title,
          },
        },
      },
    });

    // Update agent status to busy
    await tx.agent.update({
      where: { id: agentId },
      data: {
        status: 'busy',
        currentTaskId: taskId,
      },
    });

    return { success: true, task: updatedTask };
  });
}

// GET AGENTS BY ROLE
export async function getAgentsGroupedByRole() {
  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' },
  });

  // Group by role
  const grouped = agents.reduce((acc, agent) => {
    const role = (agent.config as any)?.role || 'agent';
    if (!acc[role]) acc[role] = [];
    acc[role].push(agent);
    return acc;
  }, {} as Record<string, typeof agents>);

  return grouped;
}

// GET AGENT OFFICE STATUS
export async function getAgentOfficeStatus() {
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      config: true,
      artifacts: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });

  return agents;
}

// QUICK ASSIGN TASK
export const quickAssignTask = assignTaskToAgent;

export async function linkOpenClawAgent(
  agentId: string,
  openclawAgentId: string,
  performedBy: string,
  validateNow = true
) {
  assertAdmin(performedBy);

  const trimmedOpenClawAgentId = openclawAgentId.trim();
  if (!trimmedOpenClawAgentId) throw new Error('OpenClaw Agent ID is required');

  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    const oldOpenClawAgentId = agent.openclawAgentId;
    const oldStatus = agent.openclawLinkStatus;
    let nextStatus: OpenClawLinkStatus = OpenClawLinkStatus.UNKNOWN;
    let validationError: string | undefined;

    if (validateNow) {
      try {
        await openClawProvider.getAgent(trimmedOpenClawAgentId);
        nextStatus = OpenClawLinkStatus.LINKED;
      } catch (error) {
        if (error instanceof OpenClawNotFoundError) {
          nextStatus = OpenClawLinkStatus.INVALID;
        } else {
          nextStatus = OpenClawLinkStatus.UNKNOWN;
          validationError = error instanceof Error ? error.message : String(error);
        }
      }
    }

    const updatedAgent = await tx.agent.update({
      where: { id: agentId },
      data: {
        openclawAgentId: trimmedOpenClawAgentId,
        openclawLinkStatus: nextStatus,
      },
    });

    await tx.activity.create({
      data: {
        entityType: 'agent',
        entityId: agentId,
        action: 'agent.openclaw_linked',
        performedBy,
        changes: {
          message: `Linked OpenClaw agent ID for "${agent.name}"`,
          diff: {
            openclawAgentId: {
              from: oldOpenClawAgentId,
              to: trimmedOpenClawAgentId,
            },
            openclawLinkStatus: {
              from: oldStatus,
              to: nextStatus,
            },
            ...(validationError ? { validationError } : {}),
          },
        },
      },
    });

    revalidatePath('/team');
    return { success: true, agent: updatedAgent, validationError };
  });
}

export async function unlinkOpenClawAgent(agentId: string, performedBy: string) {
  assertAdmin(performedBy);

  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    const updatedAgent = await tx.agent.update({
      where: { id: agentId },
      data: {
        openclawAgentId: null,
        openclawLinkStatus: OpenClawLinkStatus.UNLINKED,
      },
    });

    await tx.activity.create({
      data: {
        entityType: 'agent',
        entityId: agentId,
        action: 'agent.openclaw_unlinked',
        performedBy,
        changes: {
          message: `Unlinked OpenClaw agent ID for "${agent.name}"`,
          diff: {
            openclawAgentId: {
              from: agent.openclawAgentId,
              to: null,
            },
            openclawLinkStatus: {
              from: agent.openclawLinkStatus,
              to: OpenClawLinkStatus.UNLINKED,
            },
          },
        },
      },
    });

    revalidatePath('/team');
    return { success: true, agent: updatedAgent };
  });
}

export async function validateOpenClawAgentLink(agentId: string, performedBy: string) {
  assertAdmin(performedBy);

  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    if (!agent.openclawAgentId) {
      throw new Error('Agent is not linked to OpenClaw');
    }

    const oldStatus = agent.openclawLinkStatus;
    let nextStatus = OpenClawLinkStatus.UNKNOWN;
    let validationError: string | undefined;

    try {
      await openClawProvider.getAgent(agent.openclawAgentId);
      nextStatus = OpenClawLinkStatus.LINKED;
    } catch (error) {
      if (error instanceof OpenClawNotFoundError) {
        nextStatus = OpenClawLinkStatus.INVALID;
      } else {
        nextStatus = OpenClawLinkStatus.UNKNOWN;
        validationError = error instanceof Error ? error.message : String(error);
      }
    }

    const updatedAgent = await tx.agent.update({
      where: { id: agentId },
      data: {
        openclawLinkStatus: nextStatus,
      },
    });

    await tx.activity.create({
      data: {
        entityType: 'agent',
        entityId: agentId,
        action: 'agent.openclaw_validated',
        performedBy,
        changes: {
          message: `Validated OpenClaw link for "${agent.name}"`,
          diff: {
            openclawAgentId: {
              from: agent.openclawAgentId,
              to: agent.openclawAgentId,
            },
            openclawLinkStatus: {
              from: oldStatus,
              to: nextStatus,
            },
            ...(validationError ? { validationError } : {}),
          },
        },
      },
    });

    revalidatePath('/team');
    return { success: true, agent: updatedAgent, validationError };
  });
}

export async function listOpenClawAgents(performedBy: string) {
  assertAdmin(performedBy);
  const agents = await openClawProvider.listAgents();
  return agents;
}

export async function getAlsoLinkedAgents(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { openclawAgentId: true },
  });

  if (!agent?.openclawAgentId) return [];

  const agents = await prisma.agent.findMany({
    where: {
      openclawAgentId: agent.openclawAgentId,
      id: { not: agentId },
    },
    select: {
      id: true,
      name: true,
      status: true,
      openclawLinkStatus: true,
    },
    orderBy: { name: 'asc' },
  });

  return agents;
}
