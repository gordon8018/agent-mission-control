export function isValidOrchestratorToken(request: Request) {
  const configuredToken = process.env.SWARM_ORCHESTRATOR_TOKEN;

  if (!configuredToken) {
    return false;
  }

  const providedToken = request.headers.get('x-orchestrator-token');
  return providedToken === configuredToken;
}
