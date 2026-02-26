import { NextResponse } from 'next/server';
import { getSwarmRunById } from '@/lib/swarm/queries';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getSwarmRunById(id);

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  return NextResponse.json(run);
}
