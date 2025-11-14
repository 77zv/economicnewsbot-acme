/**
 * @fileoverview Client-safe type exports from the database package
 * 
 * This file exports ONLY types and enums from Prisma without importing
 * the Prisma client instance or any server-side dependencies.
 * 
 * ✅ Safe to use in client components ("use client")
 * ✅ Does not trigger Node.js API imports
 * ✅ Does not pull in @repo/env or other server-only packages
 * 
 * Usage:
 * ```tsx
 * "use client";
 * import { Schedule, Timezone, Impact } from "@repo/db/types";
 * ```
 * 
 * For server-side code that needs the Prisma client:
 * ```ts
 * import { prisma, Schedule } from "@repo/db";
 * ```
 */

export {
  // Enums
  Timezone,
  NewsScope,
  Frequency,
  Impact,
  Currency,
  Market,
  TimeDisplay,
  
  // Types
  type Schedule,
  type DiscordServer,
  type DiscordChannel,
} from "../generated/prisma";

// Re-export all other types from Prisma (but not the client instance)
export type * from "../generated/prisma";

