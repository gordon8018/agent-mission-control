import { NextResponse } from 'next/server';
import { getSwarmDashboardData } from '@/lib/swarm/queries';

export async function GET() {
  const data = await getSwarmDashboardData();
  return NextResponse.json(data);
}
