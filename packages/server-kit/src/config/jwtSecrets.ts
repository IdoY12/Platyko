import config from "config";

/** A JWT secret from `config`, trimmed; boot fails loudly when it is missing (the production gate also checks strength). */
function readRequiredSecret(key: "app.jwtAccessSecret" | "app.jwtRefreshSecret", envName: string): string {
  const value = config.get<string>(key);
  if (!value?.trim()) throw new Error(`${envName} must be configured`);
  return value.trim();
}

export const readJwtAccessSecretFromConfig = () => readRequiredSecret("app.jwtAccessSecret", "JWT_ACCESS_SECRET");
export const readJwtRefreshSecretFromConfig = () => readRequiredSecret("app.jwtRefreshSecret", "JWT_REFRESH_SECRET");
