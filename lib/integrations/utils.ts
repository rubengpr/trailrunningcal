export function requireApiKey(apiKeyName: string): string {
  const apiKey = process.env[apiKeyName];
  if (!apiKey) {
    throw new Error(`Missing ${apiKeyName}`);
  }
  return apiKey;
}
