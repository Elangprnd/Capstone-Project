import express from "express";
import { corsMiddleware } from "./middlewares/cors";
import { jsonParser } from "./middlewares/json";
import authRouter from "./routes/api/auth";
import userRouter from "./routes/api/user";
import misiRouter from "./routes/api/misi";
import applyRouter from "./routes/api/apply";
import edukasiRouter from "./routes/api/edukasi";
import adminRouter from "./routes/api/admin";

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

// Mount modular API routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/misi", misiRouter);
app.use("/api/apply", applyRouter);
app.use("/api/edukasi", edukasiRouter);
app.use("/api/admin", adminRouter);

export default app;
