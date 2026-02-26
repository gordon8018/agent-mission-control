import { ReactNode } from 'react';
import { PageLayout } from '@/components/page-layout';
import { SwarmPRCard } from '@/components/swarm/swarm-pr-card';
import { SwarmRunCard } from '@/components/swarm/swarm-run-card';
import { getSwarmDashboardData } from '@/lib/swarm/queries';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

export default async function SwarmPage() {
  const data = await getSwarmDashboardData();

  return (
    <PageLayout title="Swarm" currentPath="/swarm">
      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Active Runs">
          <div className="space-y-3">
            {data.activeRuns.map((run) => <SwarmRunCard key={run.id} run={run} />)}
          </div>
        </Section>

        <Section title="PR Queue">
          <div className="space-y-3">
            {data.prQueue.map((run) => run.pr ? <SwarmPRCard key={run.pr.id} pr={run.pr} /> : null)}
          </div>
        </Section>

        <Section title="Ready to Merge">
          <div className="space-y-3">
            {data.readyToMerge.map((run) => <SwarmRunCard key={run.id} run={run} />)}
          </div>
        </Section>

        <Section title="Failures">
          <div className="space-y-3">
            {data.failures.map((run) => <SwarmRunCard key={run.id} run={run} />)}
          </div>
        </Section>
      </div>
    </PageLayout>
  );
}
