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
      dateStrings: true,
    });
  }

  return pool;
}

export async function ensureDevelopmentUser(databaseUrl: string | null): Promise<void> {
  const database = getPool(databaseUrl);

  if (!database) {
    return;
  }

  await database.execute(
    `
      INSERT INTO users (id, email, password_hash, display_name)
      VALUES (1, 'me@example.com', 'dev-password-hash', 'Me')
      ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        display_name = VALUES(display_name)
    `,
  );
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
