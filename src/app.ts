import express from "express";
import { corsMiddleware } from "./middlewares/cors";
import { jsonParser } from "./middlewares/json";
import authRouter from "./routes/api/auth"; 
import misiRouter from "./routes/api/misi";


const app = express();

app.use(corsMiddleware);
app.use(jsonParser);

// Daftar api 
app.use("/api/auth", authRouter);
app.use("/api/misi", misiRouter);



app.get("/api", (req, res) => {
  res.json({ message: "API is running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

export default app;