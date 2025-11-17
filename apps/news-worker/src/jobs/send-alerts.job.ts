import { prisma } from "@repo/db";
import { Impact, Currency } from "@repo/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { MessageBrokerService } from "@repo/messaging";

dayjs.extend(utc);

/**
 * Checks for news events and sends alerts:
 * - 5 minutes before the event
 * - When the event is happening (on news drop)
 * Runs every minute to ensure timely alerts
 */
export class SendAlertsJob {
  private messageBroker: MessageBrokerService;
  // Track sent alerts in memory to avoid duplicates within the same session
  private sentAlerts: Set<string> = new Set();

  constructor() {
    this.messageBroker = MessageBrokerService.getInstance();
  }

  async execute(): Promise<void> {
    try {
      await this.sendFiveMinuteAlerts();
      await this.sendOnNewsDropAlerts();
    } catch (error) {
      console.error("[SendAlertsJob] Error sending alerts:", error);
      throw error;
    }
  }

  private async sendFiveMinuteAlerts(): Promise<void> {
    // Get events that will occur in 5-6 minutes
    // Using a 1-minute window to account for job execution timing
    const fiveMinutesFromNow = dayjs().add(5, "minutes").toDate();
    const sixMinutesFromNow = dayjs().add(6, "minutes").toDate();

    const upcomingEvents = await prisma.newsEvent.findMany({
      where: {
        date: {
          gte: fiveMinutesFromNow,
          lte: sixMinutesFromNow,
        },
      },
    });

    if (upcomingEvents.length > 0) {
      console.log(
        `[SendAlertsJob] Found ${upcomingEvents.length} events occurring in 5 minutes`
      );
    }

    for (const event of upcomingEvents) {
      await this.sendAlert(event, "FIVE_MINUTES_BEFORE");
    }
  }

  private async sendOnNewsDropAlerts(): Promise<void> {
    // Get events happening right now (current minute)
    const now = dayjs();
    const startOfMinute = now.startOf("minute").toDate();
    const endOfMinute = now.endOf("minute").toDate();

    const currentEvents = await prisma.newsEvent.findMany({
      where: {
        date: {
          gte: startOfMinute,
          lte: endOfMinute,
        },
      },
    });

    if (currentEvents.length > 0) {
      console.log(
        `[SendAlertsJob] Found ${currentEvents.length} events dropping NOW`
      );
    }

    for (const event of currentEvents) {
      await this.sendAlert(event, "ON_NEWS_DROP");
    }
  }

  private async sendAlert(
    event: any,
    alertType: "FIVE_MINUTES_BEFORE" | "ON_NEWS_DROP"
  ): Promise<void> {
    try {
      // Create unique key for this alert
      const alertKey = `${event.id}-${alertType}`;

      // Skip if already sent in this session
      if (this.sentAlerts.has(alertKey)) {
        return;
      }

      // Get all NewsAlert configurations that match this event's criteria
      const alertConfigs = await prisma.newsAlert.findMany({
        where: {
          // Filter by currency
          currency: {
            has: event.currency as Currency,
          },
          // Filter by impact
          impact: {
            has: event.impact as Impact,
          },
          // Filter by alert type
          alertType: {
            has: alertType,
          },
        },
        include: {
          channel: true,
          server: true,
        },
      });

      if (alertConfigs.length === 0) {
        return;
      }

      const alertTypeText = alertType === "FIVE_MINUTES_BEFORE" ? "5-minute" : "NOW";
      console.log(
        `[SendAlertsJob] Sending ${alertTypeText} alerts to ${alertConfigs.length} channels for: ${event.title}`
      );

      // Send alert to each configured channel
      for (const config of alertConfigs) {
        await this.messageBroker.publishNewsAlert({
          title: event.title,
          country: event.currency,
          impact: event.impact,
          date: event.date.toISOString(),
          forecast: event.forecast,
          previous: event.previous,
          alertType: alertType,
          channelId: config.channelId,
          serverId: config.serverId,
        });
      }

      // Mark as sent in memory
      this.sentAlerts.add(alertKey);

      // Clean up old entries from memory
      this.cleanupSentAlerts();
    } catch (error) {
      console.error(`[SendAlertsJob] Error sending ${alertType} alert:`, error);
    }
  }

  private cleanupSentAlerts(): void {
    // Keep the set size manageable by clearing it periodically
    if (this.sentAlerts.size > 1000) {
      this.sentAlerts.clear();
      console.log("[SendAlertsJob] Cleared sent alerts cache");
    }
  }
}

