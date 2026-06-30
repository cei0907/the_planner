import cors from "cors";
import express from "express";
import { TASK_MAX_LEVEL } from "@the-planner/shared";
import { loadConfig } from "./config";
import { checkDatabaseHealth, ensureDevelopmentUser, getPool } from "./db";
import { errorHandler } from "./http";
import { createTaskRouter } from "./routes/tasks";

const app = express();
const config = loadConfig();
const pool = getPool(config.databaseUrl);

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_request, response) => {
  const database = await checkDatabaseHealth(config.databaseUrl);

  response.status(database.ok ? 200 : 503).json({
    ok: database.ok,
    service: "the-planner-api",
    taskMaxLevel: TASK_MAX_LEVEL,
    database,
  });
});

if (pool) {
  app.use("/api/tasks", createTaskRouter(pool));
}

app.use(errorHandler);

async function main(): Promise<void> {
  await ensureDevelopmentUser(config.databaseUrl);

  app.listen(config.port, () => {
    console.log(`The Planner API is listening on http://localhost:${config.port}`);
  });
}

void main();
