import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { DiscordService } from "../services/discord.service";
import { ScheduleService } from "../services/schedule.service";
import { 
  Timezone, 
  NewsScope, 
  Frequency, 
  Impact, 
  Currency, 
  Market,
  TimeDisplay,
} from "@repo/db";


const discordService = DiscordService.getInstance();
const scheduleService = ScheduleService.getInstance();

export const guildRouter = createTRPCRouter({
  /**
   * Get all guilds (servers) the user is in
   */
  getMyGuilds: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user's Discord account with access token
      const account = await discordService.getUserDiscordAccount(ctx.session.user.id);

      // Fetch guilds with bot status
      const guilds = await discordService.getUserGuildsWithBotStatus(
        account.accessToken!
      );

      // Filter to only show guilds where user has admin permissions
      const adminGuilds = discordService.filterAdminGuilds(guilds);

      // Add icon URLs
      return adminGuilds.map((guild) => ({
        ...guild,
        iconUrl: discordService.getGuildIconUrl(guild.id, guild.icon),
      }));
    } catch (error) {
      console.error("Error fetching user guilds:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch Discord servers"
      );
    }
  }),

  /**
   * Get details for a specific guild including schedules
   */
  getGuildDetails: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Get user's Discord account
        const account = await discordService.getUserDiscordAccount(
          ctx.session.user.id
        );

        // Fetch user's guilds to verify access
        const guilds = await discordService.getUserGuilds(account.accessToken!);
        const guild = guilds.find((g) => g.id === input.guildId);

        if (!guild) {
          throw new Error("Guild not found or you don't have access");
        }

        // Check admin permissions
        if (!guild.owner && !discordService.hasAdminPermission(guild.permissions)) {
          throw new Error("You need admin permissions to manage this server");
        }

        // Get schedules for this guild
        const schedules = await scheduleService.getSchedulesByServerId(
          input.guildId
        );

        return {
          guild: {
            ...guild,
            iconUrl: discordService.getGuildIconUrl(guild.id, guild.icon),
          },
          schedules,
        };
      } catch (error) {
        console.error("Error fetching guild details:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to fetch guild details"
        );
      }
    }),

  /**
   * Get all schedules for a specific guild
   */
  getGuildSchedules: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify user has access to this guild
        const account = await discordService.getUserDiscordAccount(
          ctx.session.user.id
        );
        const guilds = await discordService.getUserGuilds(account.accessToken!);
        const guild = guilds.find((g) => g.id === input.guildId);

        if (!guild) {
          throw new Error("Guild not found or you don't have access");
        }

        // Get schedules
        const schedules = await scheduleService.getSchedulesByServerId(
          input.guildId
        );

        return schedules;
      } catch (error) {
        console.error("Error fetching guild schedules:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to fetch schedules"
        );
      }
    }),

  /**
   * Create a new schedule
   */
  createSchedule: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        channelId: z.string(),
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
        timeZone: z.nativeEnum(Timezone),
        newsScope: z.nativeEnum(NewsScope),
        frequency: z.nativeEnum(Frequency),
        market: z.nativeEnum(Market),
        impact: z.array(z.nativeEnum(Impact)),
        currency: z.array(z.nativeEnum(Currency)),
        timeDisplay: z.nativeEnum(TimeDisplay),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user has access to this guild
        const account = await discordService.getUserDiscordAccount(
          ctx.session.user.id
        );
        const guilds = await discordService.getUserGuilds(account.accessToken!);
        const guild = guilds.find((g) => g.id === input.guildId);

        if (!guild) {
          throw new Error("Guild not found or you don't have access");
        }

        if (!guild.owner && !discordService.hasAdminPermission(guild.permissions)) {
          throw new Error("You need admin permissions to manage this server");
        }

        // Create schedule
        const schedule = await scheduleService.createSchedule({
          serverId: input.guildId,
          channelId: input.channelId,
          hour: input.hour,
          minute: input.minute,
          timeZone: input.timeZone,
          newsScope: input.newsScope,
          frequency: input.frequency,
          market: input.market,
          impact: input.impact,
          currency: input.currency,
          timeDisplay: input.timeDisplay,
        });

        return schedule;
      } catch (error) {
        console.error("Error creating schedule:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to create schedule"
        );
      }
    }),

  /**
   * Update a schedule
   */
  updateSchedule: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        scheduleId: z.string(),
        channelId: z.string().optional(),
        hour: z.number().min(0).max(23).optional(),
        minute: z.number().min(0).max(59).optional(),
        timeZone: z.nativeEnum(Timezone).optional(),
        newsScope: z.nativeEnum(NewsScope).optional(),
        frequency: z.nativeEnum(Frequency).optional(),
        market: z.nativeEnum(Market).optional(),
        impact: z.array(z.nativeEnum(Impact)).optional(),
        currency: z.array(z.nativeEnum(Currency)).optional(),
        timeDisplay: z.nativeEnum(TimeDisplay).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user has access to this guild
        const account = await discordService.getUserDiscordAccount(
          ctx.session.user.id
        );
        const guilds = await discordService.getUserGuilds(account.accessToken!);
        const guild = guilds.find((g) => g.id === input.guildId);

        if (!guild) {
          throw new Error("Guild not found or you don't have access");
        }

        if (!guild.owner && !discordService.hasAdminPermission(guild.permissions)) {
          throw new Error("You need admin permissions to manage this server");
        }

        // Update schedule
        const { guildId, scheduleId, ...updateData } = input;
        const result = await scheduleService.editSchedule(scheduleId, {
          serverId: guildId,
          ...updateData,
        });

        return result.schedule;
      } catch (error) {
        console.error("Error updating schedule:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to update schedule"
        );
      }
    }),

  /**
   * Delete a schedule
   */
  deleteSchedule: protectedProcedure
    .input(
      z.object({
        guildId: z.string(),
        scheduleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user has access to this guild
        const account = await discordService.getUserDiscordAccount(
          ctx.session.user.id
        );
        const guilds = await discordService.getUserGuilds(account.accessToken!);
        const guild = guilds.find((g) => g.id === input.guildId);

        if (!guild) {
          throw new Error("Guild not found or you don't have access");
        }

        if (!guild.owner && !discordService.hasAdminPermission(guild.permissions)) {
          throw new Error("You need admin permissions to manage this server");
        }

        // Delete schedule
        await scheduleService.deleteSchedule(input.scheduleId);

        return { success: true };
      } catch (error) {
        console.error("Error deleting schedule:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to delete schedule"
        );
      }
    }),
});

