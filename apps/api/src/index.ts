/**
 * GiftCraft API — Stage 1 scaffold.
 *
 * Most server-side work in Sprint 1 lives inside the Next.js app (server
 * components, server actions, route handlers). This Express service exists
 * so that in later sprints we can offload:
 *   · webhook receivers (Razorpay, Shiprocket)
 *   · long-running jobs (BullMQ workers)
 *   · REST endpoints for the WhatsApp / email templates
 *   · admin cron tasks (SLA checks, quote expiry)
 *
 * For now it just exposes /health so the Docker/DO deployment has something
 * to probe.
 */
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { initSlaChecker } from "./workers/sla-checker";

const app = express();
const PORT = Number(process.env.API_PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: "giftcraft-api",
      status: "ok",
      uptime: process.uptime(),
      env: process.env.NODE_ENV ?? "development",
    },
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` },
  });
});

app.listen(PORT, async () => {
  console.log(`🟢 GiftCraft API listening on :${PORT}`);

  // Initialize workers
  try {
    await initSlaChecker();
    console.log(`🔧 SLA Checker worker initialized`);
  } catch (err) {
    console.error(`❌ Failed to initialize workers:`, err);
  }
});
