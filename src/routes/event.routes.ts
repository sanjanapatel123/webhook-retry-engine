import { Router } from "express";

import {
  createEventController,
  getEventController,
} from "../controllers/event.controllers.js";

const router = Router();

router.post("/events", createEventController);

router.get("/events/:eventId", getEventController);

export default router;
