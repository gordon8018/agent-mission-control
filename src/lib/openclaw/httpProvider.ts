import { OpenClawAgentSummary, OpenClawNotFoundError, OpenClawProvider } from './provider';

const DEFAULT_TIMEOUT_MS = 5000;

function withTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export class HttpOpenClawProvider implements OpenClawProvider {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(params?: { baseUrl?: string; apiKey?: string; timeoutMs?: number }) {
    this.baseUrl = (params?.baseUrl || process.env.OPENCLAW_API_BASE_URL || '').replace(/\/$/, '');
    this.apiKey = params?.apiKey || process.env.OPENCLAW_API_KEY;
    this.timeoutMs = params?.timeoutMs || Number(process.env.OPENCLAW_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  }

  async getAgent(id: string): Promise<OpenClawAgentSummary> {
    if (!this.baseUrl) throw new Error('OPENCLAW_API_BASE_URL is not configured');

    const response = await fetch(`${this.baseUrl}/agents/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.buildHeaders(),
      signal: withTimeoutSignal(this.timeoutMs),
      cache: 'no-store',
    });

    if (response.status === 404) {
      throw new OpenClawNotFoundError(`OpenClaw agent ${id} was not found`);
    }

    if (!response.ok) {
      throw new Error(`OpenClaw getAgent failed (${response.status})`);
    }

    const payload = await response.json();
    return {
      id: payload.id || id,
      name: payload.name,
      status: payload.status,
    };
  }

  async listAgents(): Promise<OpenClawAgentSummary[]> {
    if (!this.baseUrl) return [];

    try {
      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: withTimeoutSignal(this.timeoutMs),
        cache: 'no-store',
      });

      if (response.status === 404 || response.status === 405 || response.status === 501) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`OpenClaw listAgents failed (${response.status})`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) return [];

      return payload.map((agent: any) => ({
        id: String(agent.id),
        name: agent.name,
        status: agent.status,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OpenClaw listAgents timed out');
      }
      throw error;
    }
  }

  private buildHeaders() {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}

export const openClawProvider = new HttpOpenClawProvider();
