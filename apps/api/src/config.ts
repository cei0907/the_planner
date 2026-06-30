import "dotenv/config";

export interface AppConfig {
  port: number;
  databaseUrl: string | null;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL ?? null,
  };
}
