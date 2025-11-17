import type { Currency, Impact } from "@repo/db";

// Re-export enums directly from Prisma
export type {
  DiscordServer,
  DiscordChannel,
  Schedule,
  NewsAlert,
} from "@repo/db";

export {
  Market,
  Impact,
  Currency,
  NewsScope,
  Frequency,
  Timezone,
  TimeDisplay,
  AlertType,
} from "@repo/db";

export type News = {
  title: string;
  country: Currency;
  date: string;
  impact: Impact;
  forecast: string;
  previous: string;
};

export function parseEnumArray<T>(
  input: string | undefined,
  validValues: T[],
): T[] {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => validValues.includes(item as T)) as T[];
}
