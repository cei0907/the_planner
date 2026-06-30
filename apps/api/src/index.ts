import cors from "cors";
import express from "express";
import { TASK_MAX_LEVEL } from "@the-planner/shared";
import { loadConfig } from "./config";
import { checkDatabaseHealth } from "./db";

const app = express();
const config = loadConfig();

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

app.listen(config.port, () => {
  console.log(`The Planner API is listening on http://localhost:${config.port}`);
});
