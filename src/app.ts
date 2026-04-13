import express from "express";
import { corsMiddleware } from "./middlewares/cors";
import { jsonParser } from "./middlewares/json";

const app = express();


app.use(corsMiddleware);
app.use(jsonParser);


app.get("/api", (req, res) => {
  res.json({ message: "API is running" });
});

// GET API HEALTH
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

export default app;
