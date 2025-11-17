import "@repo/env";
import { ScheduleService, Schedule } from "@repo/api";
import { NewsService } from "@repo/api";
import { MessageBrokerService } from "@repo/messaging";
import { Market, NewsScope } from "@repo/api";
import cron from "node-cron";

class SchedulerProcess {
  private scheduleService: ScheduleService;
  private newsService: NewsService;
  private messageBroker: MessageBrokerService;

  constructor() {
    this.scheduleService = ScheduleService.getInstance();
    this.newsService = NewsService.getInstance();
    this.messageBroker = MessageBrokerService.getInstance();
  }

  public async start(): Promise<void> {
    try {
      // Connect to RabbitMQ
      await this.messageBroker.connect();
      console.log("Connected to RabbitMQ");

      // Run every 5 minutes (0,5,10,15,20,25,30,35,40,45,50,55)
      cron.schedule("*/5 * * * *", async () => {
        try {
          // Get current time in New York timezone
          const nyTime = new Date().toLocaleString("en-US", {
            timeZone: "America/New_York",
            hour12: false,
          });
          const nyDate = new Date(nyTime);
          const currentHour = nyDate.getHours();
          const currentMinute = nyDate.getMinutes();

          console.log(
            `Checking schedules for ${currentHour}:${currentMinute} New York Time`
          );

          const matchingSchedules =
            await this.scheduleService.getSchedulesForTime(
              currentHour,
              currentMinute
            );

          if (matchingSchedules.length > 0) {
            console.log(
              `Found ${matchingSchedules.length} schedules for ${currentHour}:${currentMinute} New York Time`
            );
          }

          for (const schedule of matchingSchedules) {
            await this.processSchedule(schedule);
          }
        } catch (error) {
          console.error("Error in scheduler:", error);
        }
      });

      console.log(
        "Scheduler process started - running every 5 minutes (New York Time)"
      );
    } catch (error) {
      console.error("Failed to start scheduler process:", error);
      process.exit(1);
    }
  }

  private async processSchedule(schedule: Schedule): Promise<void> {
    try {
      const news = await this.getNewsForSchedule(schedule);
      if (!news || news.length === 0) {
        console.log(`No news found for schedule ${schedule.id}`);
        return;
      }

      await this.messageBroker.publishScheduleTask(schedule, news);
      console.log(`Published schedule task ${schedule.id} to queue`);
    } catch (error) {
      console.error(`Error processing schedule ${schedule.id}:`, error);
    }
  }

  private async getNewsForSchedule(schedule: Schedule): Promise<any[]> {
    const options = {
      market: schedule.market as Market,
      currency: schedule.currency,
      impact: schedule.impact,
      timezone: schedule.timeZone,
    };

    switch (schedule.newsScope) {
      case NewsScope.DAILY:
        return await this.newsService.getTodayNews(options);
      case NewsScope.WEEKLY:
        return await this.newsService.getWeeklyNews(options);
      case NewsScope.TOMORROW:
        return await this.newsService.getTomorrowNews(options);
      default:
        return [];
    }
  }
}

// Start the scheduler process
const scheduler = new SchedulerProcess();
scheduler.start().catch(console.error);
