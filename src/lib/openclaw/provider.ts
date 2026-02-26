export class OpenClawNotFoundError extends Error {
  constructor(message = 'OpenClaw agent not found') {
    super(message);
    this.name = 'OpenClawNotFoundError';
  }
}

export interface OpenClawAgentSummary {
  id: string;
  name?: string;
  status?: string;
}

export interface OpenClawProvider {
  getAgent(id: string): Promise<OpenClawAgentSummary>;
  listAgents(): Promise<OpenClawAgentSummary[]>;
}
