import { prisma } from "@repo/db";
import { Impact, Currency } from "@repo/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { MessageBrokerService } from "@repo/messaging";

dayjs.extend(utc);
dayjs.extend(timezone);

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
    const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
    console.log(`[SendAlertsJob] Checking for alerts at ${now}`);
    
    try {
      await this.sendFiveMinuteAlerts();
      await this.sendOnNewsDropAlerts();
      console.log(`[SendAlertsJob] Alert check completed`);
    } catch (error) {
      console.error("[SendAlertsJob] Error sending alerts:", error);
      throw error;
    }
  }

  private async sendFiveMinuteAlerts(): Promise<void> {
    // Get events that will occur in exactly 5 minutes
    // Database stores naive timestamps, so we need to create a Date object 
    // that treats local time as UTC
    const fiveMinutesFromNow = dayjs().add(5, "minutes").startOf("minute");
    const timeString = fiveMinutesFromNow.format('YYYY-MM-DD HH:mm:00');
    // Parse as UTC so the time matches database naive timestamp
    const targetTime = dayjs.utc(timeString).toDate();

    console.log(`[SendAlertsJob] Looking for 5-min alerts at ${timeString}`);
    console.log(`[SendAlertsJob] Target time object:`, targetTime);

    const upcomingEvents = await prisma.newsEvent.findMany({
      where: {
        date: targetTime,
      },
    });

    if (upcomingEvents.length > 0) {
      console.log(
        `[SendAlertsJob] ⏰ Found ${upcomingEvents.length} events occurring in 5 minutes`
      );

      await this.sendGroupedAlerts(upcomingEvents, "FIVE_MINUTES_BEFORE");
    } else {
      console.log(`[SendAlertsJob] No 5-minute alerts needed`);
    }
  }

  private async sendOnNewsDropAlerts(): Promise<void> {
    // Get events happening right now (current minute)
    // Database stores naive timestamps, so we need to create a Date object 
    // that treats local time as UTC
    const now = dayjs().startOf("minute");
    const timeString = now.format('YYYY-MM-DD HH:mm:00');
    // Parse as UTC so the time matches database naive timestamp
    const targetTime = dayjs.utc(timeString).toDate();
    
    console.log(`[SendAlertsJob] Looking for on-drop alerts at ${timeString}`);
    console.log(`[SendAlertsJob] Target time object:`, targetTime);

    const currentEvents = await prisma.newsEvent.findMany({
      where: {
        date: targetTime,
      },
    });

    if (currentEvents.length > 0) {
      console.log(`[SendAlertsJob] Events found:`, currentEvents.map(e => ({ 
        title: e.title, 
        date: dayjs(e.date).format('YYYY-MM-DD HH:mm:ss'),
        currency: e.currency,
        impact: e.impact
      })));
      console.log(
        `[SendAlertsJob] 🚨 Found ${currentEvents.length} events dropping NOW`
      );

      await this.sendGroupedAlerts(currentEvents, "ON_NEWS_DROP");
    } else {
      console.log(`[SendAlertsJob] No on-drop alerts needed`);
    }
  }

  private async sendGroupedAlerts(
    events: any[],
    alertType: "FIVE_MINUTES_BEFORE" | "ON_NEWS_DROP"
  ): Promise<void> {
    try {
      // Get all alert configurations for this alert type
      const allAlertConfigs = await prisma.newsAlert.findMany({
        where: {
          alertType: {
            has: alertType,
          },
        },
        include: {
          channel: true,
          server: true,
        },
      });

      if (allAlertConfigs.length === 0) {
        return;
      }

      const alertTypeText = alertType === "FIVE_MINUTES_BEFORE" ? "5-minute" : "NOW";
      const emoji = alertType === "FIVE_MINUTES_BEFORE" ? "⏰" : "🚨";

      // Group events by channel - for each channel, collect all matching events
      for (const config of allAlertConfigs) {
        // Filter events that match this channel's configuration
        const matchingEvents = events.filter((event) => {
          // Check if already sent
          const alertKey = `${event.id}-${alertType}`;
          if (this.sentAlerts.has(alertKey)) {
            return false;
          }

          // Empty currency array means match all currencies
          const matchesCurrency =
            config.currency.length === 0 ||
            config.currency.includes(event.currency as Currency);

          // Empty impact array means match all impacts
          const matchesImpact =
            config.impact.length === 0 ||
            config.impact.includes(event.impact as Impact);

          return matchesCurrency && matchesImpact;
        });

        if (matchingEvents.length > 0) {
          console.log(
            `[SendAlertsJob] ${emoji} Sending ${alertTypeText} alert to channel ${config.channelId} with ${matchingEvents.length} events`
          );

          // Send grouped alert to channel
          await this.messageBroker.publishGroupedNewsAlert({
            events: matchingEvents.map(event => ({
              title: event.title,
              country: event.currency,
              impact: event.impact,
              date: event.date.toISOString(),
              forecast: event.forecast,
              previous: event.previous,
            })),
            alertType: alertType,
            channelId: config.channelId,
            serverId: config.serverId,
            roleId: config.roleId ?? undefined,
          });

          // Mark all events as sent
          for (const event of matchingEvents) {
            const alertKey = `${event.id}-${alertType}`;
            this.sentAlerts.add(alertKey);
          }
        }
      }

      // Clean up old entries from memory
      this.cleanupSentAlerts();
    } catch (error) {
      console.error(`[SendAlertsJob] Error sending ${alertType} alerts:`, error);
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

