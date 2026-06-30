import cors from "cors";
import express from "express";
import { TASK_MAX_LEVEL } from "@the-planner/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "the-planner-api",
    taskMaxLevel: TASK_MAX_LEVEL,
  });
});

app.listen(port, () => {
  console.log(`The Planner API is listening on http://localhost:${port}`);
});
