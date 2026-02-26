import { prisma } from '@/lib/prisma';

export async function logSwarmActivity(params: {
  entityId: string;
  action: 'swarm.run_created' | 'swarm.status_updated';
  performedBy: string;
  changes?: unknown;
}) {
  const { entityId, action, performedBy, changes } = params;

  await prisma.activity.create({
    data: {
      entityType: 'swarm_run',
      entityId,
      action,
      performedBy,
      changes: changes ?? undefined,
    },
  });
}
