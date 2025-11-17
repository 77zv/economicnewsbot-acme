import { prisma } from "@repo/db";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

/**
 * Cleans up old processed news events from the database
 * Runs weekly to keep database size manageable
 */
export class CleanupJob {
  // Retention period: how many days to keep processed events
  private readonly RETENTION_DAYS = 30;

  async execute(): Promise<void> {
    console.log("[CleanupJob] Starting database cleanup...");

    try {
      const cutoffDate = dayjs().subtract(this.RETENTION_DAYS, "days").toDate();

      // Delete old events older than retention period
      const result = await prisma.newsEvent.deleteMany({
        where: {
          date: {
            lt: cutoffDate,
          },
        },
      });

      console.log(
        `[CleanupJob] Deleted ${result.count} events older than ${this.RETENTION_DAYS} days`
      );

      console.log("[CleanupJob] Database cleanup completed successfully");
    } catch (error) {
      console.error("[CleanupJob] Error during cleanup:", error);
      throw error;
    }
  }
}

