import "@repo/env";
import cron from "node-cron";
import { FetchNewsJob } from "./jobs/fetch-news.job.js";
import { SendAlertsJob } from "./jobs/send-alerts.job.js";
import { CleanupJob } from "./jobs/cleanup.job.js";
import { MessageBrokerService } from "@repo/messaging";

class NewsWorkerProcess {
  private fetchNewsJob: FetchNewsJob;
  private sendAlertsJob: SendAlertsJob;
  private cleanupJob: CleanupJob;
  private messageBroker: MessageBrokerService;

  constructor() {
    this.fetchNewsJob = new FetchNewsJob();
    this.sendAlertsJob = new SendAlertsJob();
    this.cleanupJob = new CleanupJob();
    this.messageBroker = MessageBrokerService.getInstance();
  }

  public async start(): Promise<void> {
    try {
      console.log("=================================");
      console.log("News Worker Process Starting...");
      console.log("=================================");

      // Connect to RabbitMQ
      await this.messageBroker.connect();
      console.log("✓ Connected to RabbitMQ");

      // Run initial sync on startup (optional - comment out if not desired)
      console.log("Running initial news sync...");
      await this.fetchNewsJob.execute();

      // Schedule Job 1: Fetch & Store News
      // Runs daily at 2:00 AM
      cron.schedule("0 2 * * *", async () => {
        console.log("\n[CRON] Starting daily news fetch job...");
        try {
          await this.fetchNewsJob.execute();
        } catch (error) {
          console.error("[CRON] Fetch news job failed:", error);
        }
      });
      console.log("✓ Scheduled: Fetch news (daily at 2:00 AM)");

      // Schedule Job 2: Send Alerts (5-min before & on news drop)
      // Runs every minute
      cron.schedule("* * * * *", async () => {
        try {
          await this.sendAlertsJob.execute();
        } catch (error) {
          console.error("[CRON] Send alerts job failed:", error);
        }
      });
      console.log("✓ Scheduled: Send alerts (every minute)");

      // Schedule Job 3: Cleanup Old Events
      // Runs weekly on Sunday at 3:00 AM
      cron.schedule("0 3 * * 0", async () => {
        console.log("\n[CRON] Starting weekly cleanup job...");
        try {
          await this.cleanupJob.execute();
        } catch (error) {
          console.error("[CRON] Cleanup job failed:", error);
        }
      });
      console.log("✓ Scheduled: Cleanup (weekly on Sunday at 3:00 AM)");

      console.log("\n=================================");
      console.log("News Worker Process Running");
      console.log("=================================");
      console.log("Jobs scheduled:");
      console.log("  • Fetch news: Daily at 2:00 AM");
      console.log("  • Send alerts: Every minute");
      console.log("  • Cleanup: Weekly (Sunday 3:00 AM)");
      console.log("=================================\n");
    } catch (error) {
      console.error("Failed to start news worker process:", error);
      process.exit(1);
    }
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    console.log("\nShutting down news worker...");
    await this.messageBroker.disconnect();
    console.log("✓ Disconnected from RabbitMQ");
    process.exit(0);
  }
}

// Start the worker process
const worker = new NewsWorkerProcess();
worker.start().catch(console.error);

// Handle graceful shutdown
process.on("SIGINT", () => worker.shutdown());
process.on("SIGTERM", () => worker.shutdown());

