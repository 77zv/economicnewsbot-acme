import type { News, Currency, Impact } from "../models/index.js";
import { Market, Timezone } from "../models/index.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { getIANATimezone } from "../utils/timezoneMapping.js";

dayjs.extend(utc);
dayjs.extend(timezone);

enum TimeScope {
  TODAY = "today",
  TOMORROW = "tomorrow",
  WEEKLY = "weekly",
}

export interface NewsOptions {
  market: Market;
  currency?: Currency[];
  impact?: Impact[];
  timezone?: Timezone;
}

export class NewsService {
  private static instance: NewsService | null = null;
  private readonly cache: Map<string, { data: News[]; timestamp: number }> = new Map<string, { data: News[]; timestamp: number }>();
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  private async fetchFromAPI(endpoint: string): Promise<News[]> {
    if (this.isCacheValid(endpoint)) {
      return this.cache.get(endpoint)!.data;
    }

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as { title: string; country: Currency; impact: Impact; date: string; forecast: string; previous: string }[];
      const news: News[] = data.map((item) => ({
        title: item.title,
        country: item.country,
        impact: item.impact,
        date: item.date,
        forecast: item.forecast,
        previous: item.previous,
      }));

      this.cache.set(endpoint, { data: news, timestamp: Date.now() });
      return news;
    } catch (error) {
      console.error("Error fetching news:", error);
      throw error;
    }
  }

  private async fetchWeeklyNews(market: Market): Promise<News[]> {
    switch (market.toUpperCase()) {
      case Market.FOREX:
        return this.fetchFromAPI(
          "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
        );
      case Market.CRYPTO:
        return this.fetchFromAPI(
          "https://nfs.faireconomy.media/cc_calendar_thisweek.json"
        );
      case Market.ENERGY:
        return this.fetchFromAPI(
          "https://nfs.faireconomy.media/ee_calendar_thisweek.json"
        );
      case Market.METAL:
        return this.fetchFromAPI(
          "https://nfs.faireconomy.media/mm_calendar_thisweek.json"
        );
      default:
        throw new Error(`Invalid market: ${market}`);
    }
  }

  private filterNewsByOptions(
    news: News[],
    options: NewsOptions,
    command: TimeScope
  ): News[] {
    // Get target timezone
    const targetTz =
      !options.timezone || options.timezone === Timezone.DEFAULT
        ? "America/New_York"
        : getIANATimezone(options.timezone);

    // Get current date in target timezone
    const nowInTz = dayjs().tz(targetTz);

    return news
      .filter((item) => {
        // Basic filters
        const matchesCurrency =
          !options.currency?.length || options.currency.includes(item.country);
        const matchesImpact =
          !options.impact?.length ||
          options.impact.includes(item.impact.toUpperCase() as Impact);

        // Date filter - convert to target timezone but preserve time
        const itemDate = dayjs(item.date).tz(targetTz);

        // Compare dates using same-day check
        const isToday =
          itemDate.format("YYYY-MM-DD") === nowInTz.format("YYYY-MM-DD");
        const isTomorrow =
          itemDate.format("YYYY-MM-DD") ===
          nowInTz.add(1, "day").format("YYYY-MM-DD");

        const matchesDate =
          command === TimeScope.WEEKLY ||
          (command === TimeScope.TODAY && isToday) ||
          (command === TimeScope.TOMORROW && isTomorrow);

        return matchesCurrency && matchesImpact && matchesDate;
      })
      .map((item) => {
        if (options.timezone && item.date) {
          const convertedDate = dayjs(item.date)
            .tz(targetTz)
            .format("YYYY-MM-DD HH:mm:ss");

          return {
            ...item,
            date: convertedDate,
          };
        }
        return item;
      });
  }

  async getTodayNews(options: NewsOptions): Promise<News[]> {
    try {
      const news = await this.fetchWeeklyNews(options.market);
      return this.filterNewsByOptions(news, options, TimeScope.TODAY);
    } catch (error) {
      console.error("Error getting today news:", error);
      throw new Error(`Failed to get today news`);
    }
  }

  async getTomorrowNews(options: NewsOptions): Promise<News[]> {
    try {
      const news = await this.fetchWeeklyNews(options.market);
      return this.filterNewsByOptions(news, options, TimeScope.TOMORROW);
    } catch (error) {
      console.error("Error getting tomorrow news:", error);
      throw new Error(`Failed to get tomorrow news`);
    }
  }

  async getWeeklyNews(options: NewsOptions): Promise<News[]> {
    try {
      const news = await this.fetchWeeklyNews(options.market);
      return this.filterNewsByOptions(news, options, TimeScope.WEEKLY);
    } catch (error) {
      console.error("Error getting weekly news:", error);
      throw new Error(`Failed to get weekly news`);
    }
  }

  // For testing
  public static resetInstance(): void {
    NewsService.instance = null;
  }
}
