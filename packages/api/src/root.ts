import { exampleRouter } from "./routers/example.js";
import { guildRouter } from "./routers/guild.router.js";
import { createTRPCRouter } from "./trpc.js";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  guild: guildRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
