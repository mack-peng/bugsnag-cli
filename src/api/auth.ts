export interface AuthConfig {
  token?: string;
}

export interface AuthProvider {
  getHeaders(): Record<string, string>;
}

export function createAuthProvider(config: AuthConfig): AuthProvider {
  if (!config.token)
    throw new Error('Missing auth token. Set BUGSNAG_AUTH_TOKEN env var, --auth-token flag, or run: bugsnag-cli config-set auth-token <value>');
  return {
    getHeaders: () => ({ Authorization: `token ${config.token}` }),
  };
}
