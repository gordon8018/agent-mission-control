import { OpenClawAgentSummary, OpenClawNotFoundError, OpenClawProvider } from './provider';

export class MockOpenClawProvider implements OpenClawProvider {
  constructor(private readonly agents: OpenClawAgentSummary[] = []) {}

  async getAgent(id: string): Promise<OpenClawAgentSummary> {
    const found = this.agents.find((agent) => agent.id === id);
    if (!found) {
      throw new OpenClawNotFoundError(`Mock OpenClaw agent ${id} was not found`);
    }

    return found;
  }

  async listAgents(): Promise<OpenClawAgentSummary[]> {
    return [...this.agents];
  }
}
