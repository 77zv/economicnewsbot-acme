import { NewsService } from "@repo/api";
import { Market, Impact, Currency } from "@repo/api";
import { prisma } from "@repo/db";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

/**
 * Fetches news events from the API and stores them in the database
 * Runs daily at 2 AM to sync the next 7-14 days of events
 */
export class FetchNewsJob {
  private newsService: NewsService;

  constructor() {
    this.newsService = NewsService.getInstance();
  }

  async execute(): Promise<void> {
    console.log("[FetchNewsJob] Starting daily news sync...");

    try {
      // const markets = [Market.FOREX, Market.CRYPTO, Market.ENERGY, Market.METAL];
      const markets = [Market.FOREX]
      
      for (const market of markets) {
        await this.fetchAndStoreNewsForMarket(market);
      }

      console.log("[FetchNewsJob] Daily news sync completed successfully");
    } catch (error) {
      console.error("[FetchNewsJob] Error during news sync:", error);
      throw error;
    }
  }

  private async fetchAndStoreNewsForMarket(market: Market): Promise<void> {
    try {
      console.log(`[FetchNewsJob] Fetching news for market: ${market}`);

      // Fetch weekly news (ForexFactory should be next 7 days)
      const news = await this.newsService.getWeeklyNews({
        market,
      });

      console.log(`[FetchNewsJob] Found ${news.length} news events for ${market}`);

      // Store each news event
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const newsItem of news) {
        try {
          // Map "country" from API to Currency enum
          const currency = newsItem.country.toUpperCase() as Currency;
          const impact = newsItem.impact.toUpperCase() as Impact;

          // Check if currency is valid
          if (!Object.values(Currency).includes(currency)) {
            console.warn(`[FetchNewsJob] Invalid currency: ${newsItem.country}, skipping event`);
            skipped++;
            continue;
          }

          // Parse date
          const eventDate = dayjs(newsItem.date).toDate();

          // Upsert based on unique constraint [title, date, impact, currency]
          const result = await prisma.newsEvent.upsert({
            where: {
              title_date_impact_currency: {
                title: newsItem.title,
                date: eventDate,
                impact: impact,
                currency: currency,
              },
            },
            update: {
              forecast: newsItem.forecast || "",
              previous: newsItem.previous || "",
              // Don't overwrite actual if it already exists
            },
            create: {
              title: newsItem.title,
              currency: currency,
              date: eventDate,
              impact: impact,
              forecast: newsItem.forecast || "",
              previous: newsItem.previous || "",
              source: "ForexFactory",
            },
          });

          // Track if this was a new record or update
          // Prisma doesn't tell us directly, so we'll just count all as processed
          created++;
        } catch (error) {
          console.error(`[FetchNewsJob] Error storing news event:`, error);
          skipped++;
        }
      }

      console.log(
        `[FetchNewsJob] Market ${market}: Processed ${news.length} events (${created} upserted, ${skipped} skipped)`
      );
    } catch (error) {
      console.error(`[FetchNewsJob] Error fetching news for market ${market}:`, error);
      throw error;
    }
  }
}

