import express from "express";
import eventRoutes from "./routes/event.routes.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Webhook Retry Engine is running",
  });
});

app.use(eventRoutes);

export default app;