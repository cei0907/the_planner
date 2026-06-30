import mysql from "mysql2/promise";

export interface DatabaseHealth {
  ok: boolean;
  configured: boolean;
  message: string;
}

let pool: mysql.Pool | null = null;

export function getPool(databaseUrl: string | null): mysql.Pool | null {
  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
  }

  return pool;
}

export async function checkDatabaseHealth(databaseUrl: string | null): Promise<DatabaseHealth> {
  const database = getPool(databaseUrl);

  if (!database) {
    return {
      ok: false,
      configured: false,
      message: "DATABASE_URL is not configured.",
    };
  }

  try {
    await database.query("SELECT 1");

    return {
      ok: true,
      configured: true,
      message: "Database connection is healthy.",
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      message: error instanceof Error ? error.message : "Database connection failed.",
    };
  }
}
