import type { CreateScheduleWithoutServerTime } from "../repositories/schedule.repository.js";
import { PrismaScheduleRepository } from "../repositories/schedule.repository.js";
import type { UpdateScheduleDTO } from "../repositories/schedule.repository.js";
import { PrismaServerRepository } from "../repositories/discordServer.repository.js";
import { PrismaChannelRepository } from "../repositories/discordChannel.repository.js";
import  {
  type DiscordChannel,
  type DiscordServer,
  Timezone,
  type Schedule,
} from "@repo/db";
import { getIANATimezone } from "../utils/timezoneMapping.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export class ScheduleService {
  private static instance: ScheduleService | null = null;
  private readonly scheduleRepository: PrismaScheduleRepository;
  private readonly serverRepository: PrismaServerRepository;
  private readonly channelRepository: PrismaChannelRepository;
  private constructor() {
    this.scheduleRepository = new PrismaScheduleRepository();
    this.serverRepository = new PrismaServerRepository();
    this.channelRepository = new PrismaChannelRepository();
  }

  public static getInstance(): ScheduleService {
    if (!ScheduleService.instance) {
      ScheduleService.instance = new ScheduleService();
    }
    return ScheduleService.instance;
  }

  public async createSchedule(
    data: CreateScheduleWithoutServerTime
  ): Promise<Schedule> {
    try {
      const serverExists = await this._checkServerExists(data.serverId);
      if (!serverExists) {
        await this.serverRepository.create({ guildId: data.serverId });
        console.log(
          `Server with id ${data.serverId} does not exist. It has been created to create a schedule.`
        );
      }

      const channelExists = await this._checkChannelExists({
        channelId: data.channelId,
        serverId: data.serverId,
      });
      if (!channelExists) {
        await this.channelRepository.create({
          channelId: data.channelId,
          serverId: data.serverId,
        });
        console.log(
          `Channel with id ${data.channelId} does not exist. It has been created to create a schedule.`
        );
      }

      const existingSchedule = await this._checkScheduleExists({
        channelId: data.channelId,
        serverId: data.serverId,
        hour: data.hour,
        minute: data.minute,
      });

      if (existingSchedule) {
        console.log(
          `Schedule with channelId ${data.channelId}, serverId ${data.serverId} and time ${data.hour}:${data.minute} already exists. Updating it.`
        );
        const updatedSchedule = await this.editSchedule(
          existingSchedule.id,
          data
        );
        return updatedSchedule.schedule;
      }

      // Check if server already has 2 schedules
      const existingSchedules = await this.scheduleRepository.findByServerId(data.serverId);
      if (existingSchedules.length >= 2) {
        throw new Error(`Your server has reached the maximum limit of 2 schedules. Please delete an existing schedule before creating a new one.`);
      }

      const { hour: hourInServerTime, minute: minuteInServerTime } =
        this._convertToServerTime(data.hour, data.minute, data.timeZone);

      const scheduleData = {
        ...data,
        hourServerTime: hourInServerTime,
        minuteServerTime: minuteInServerTime,
      };

      const schedule = await this.scheduleRepository.create(scheduleData);
      console.log(
        `Schedule with id ${schedule.id} has been created for the server ${data.serverId}.`
      );
      return schedule;
    } catch (error) {
      console.error("Error creating schedule:", error);
      // Re-throw the original error to preserve the error message
      throw error;
    }
  }

  public async listSchedulesForServer(serverId: string): Promise<Schedule[]> {
    try {
      return await this.scheduleRepository.findByServerId(serverId);
    } catch (error) {
      console.error("Error listing schedules:", error);
      throw new Error(`Failed to list schedules`);
    }
  }

  // For testing purposes
  public static resetInstance(): void {
    ScheduleService.instance = null;
  }

  public async editSchedule(
    id: string,
    data: UpdateScheduleDTO
  ): Promise<{ schedule: Schedule; merged?: boolean }> {
    try {
      const existingSchedule = await this.scheduleRepository.findById(id);
      if (!existingSchedule) {
        throw new Error(`Schedule with id ${id} not found`);
      }

      let serverTime;
      if (data.hour !== undefined || data.minute !== undefined) {
        const hour = data.hour ?? existingSchedule.hour;
        const minute = data.minute ?? existingSchedule.minute;
        const timezone = data.timeZone ?? existingSchedule.timeZone;
        serverTime = this._convertToServerTime(hour, minute, timezone);
      }

      if (data.hour ?? data.minute) {
        const conflictingSchedule = await this._checkScheduleExists({
          channelId: data.channelId ?? existingSchedule.channelId,
          serverId: data.serverId ?? existingSchedule.serverId,
          hour: data.hour ?? existingSchedule.hour,
          minute: data.minute ?? existingSchedule.minute,
        });

        if (conflictingSchedule && conflictingSchedule.id !== id) {
          await this.scheduleRepository.delete(conflictingSchedule.id);
          const updatedSchedule = {
            ...existingSchedule,
            ...data,
            hourServerTime: serverTime?.hour,
            minuteServerTime: serverTime?.minute,
          };
          const result = await this.scheduleRepository.update(
            id,
            updatedSchedule
          );

          return {
            schedule: result,
            merged: true,
          };
        }
      }

      const updatedSchedule = {
        ...existingSchedule,
        ...data,
        ...(serverTime && {
          hourServerTime: serverTime.hour,
          minuteServerTime: serverTime.minute,
        }),
      };
      const result = await this.scheduleRepository.update(id, updatedSchedule);
      return {
        schedule: result,
        merged: false,
      };
    } catch (error) {
      console.error("Error editing schedule:", error);
      throw new Error(`Failed to edit schedule`);
    }
  }

  public async deleteAllSchedulesForServer(serverId: string): Promise<number> {
    try {
      const result = await this.scheduleRepository.deleteMany(serverId);
      return result;
    } catch (error) {
      console.error("Error deleting all schedules:", error);
      throw new Error(`Failed to delete all schedules`);
    }
  }

  public async deleteAllSchedulesForChannel(
    serverId: string,
    channelId: string
  ): Promise<number> {
    try {
      const schedules = await this.scheduleRepository.findByServerId(serverId);
      const channelSchedules = schedules.filter(
        (s) => s.channelId === channelId
      );

      for (const schedule of channelSchedules) {
        await this.scheduleRepository.delete(schedule.id);
      }

      return channelSchedules.length;
    } catch (error) {
      console.error("Error deleting channel schedules:", error);
      throw new Error(`Failed to delete channel schedules`);
    }
  }

  public async deleteSchedule(id: string): Promise<Schedule> {
    try {
      const existingSchedule = await this.scheduleRepository.findById(id);
      if (!existingSchedule) {
        throw new Error(`Schedule with id ${id} not found`);
      }

      await this.scheduleRepository.delete(id);
      return existingSchedule;
    } catch (error) {
      console.error("Error getting schedule:", error);
      throw new Error(`Failed to get schedule`);
    }
  }

  async getSchedulesForHour(hour: number): Promise<Schedule[]> {
    try {
      return await this.scheduleRepository.findByHour(hour);
    } catch (error) {
      console.error("Error getting schedules for hour:", error);
      throw new Error(`Failed to get schedules for hour ${hour}`);
    }
  }

  public async getSchedulesForTime(
    hour: number,
    minute: number
  ): Promise<Schedule[]> {
    try {
      return await this.scheduleRepository.findByHourAndMinute(hour, minute);
    } catch (error) {
      console.error("Error getting schedules for time:", error);
      throw new Error(`Failed to get schedules for time ${hour}:${minute}`);
    }
  }

  public async getSchedulesByServerId(serverId: string): Promise<Schedule[]> {
    try {
      return await this.scheduleRepository.findByServerId(serverId);
    } catch (error) {
      console.error("Error getting schedules for server:", error);
      throw new Error(`Failed to get schedules for server ${serverId}`);
    }
  }

  private async _checkServerExists(
    serverId: string
  ): Promise<DiscordServer | null> {
    const server = await this.serverRepository.findByGuildId(serverId);
    return server;
  }

  private async _checkChannelExists({
    channelId,
    serverId,
  }: {
    channelId: string;
    serverId: string;
  }): Promise<DiscordChannel | null> {
    const channel = await this.channelRepository.findByChannelId(channelId);
    return channel?.serverId == serverId ? channel : null;
  }

  private async _checkScheduleExists({
    channelId,
    serverId,
    hour,
    minute,
  }: {
    channelId: string;
    serverId: string;
    hour: number;
    minute: number;
  }): Promise<Schedule | null> {
    const schedule =
      await this.scheduleRepository.findByChannelIdServerIdHourMinute({
        channelId,
        serverId,
        hour,
        minute,
      });
    return schedule;
  }

  private _convertToServerTime(
    hour: number,
    minute: number,
    timezone: Timezone
  ): { hour: number; minute: number } {
    const userTz =
      timezone === Timezone.DEFAULT
        ? "America/New_York"
        : getIANATimezone(timezone);

    // Create a date object in the user's timezone
    const userDate = dayjs()
      .tz(userTz)
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0);

    // Convert directly to NY time
    const nyDate = userDate.tz("America/New_York");

    return {
      hour: nyDate.hour(),
      minute: nyDate.minute(),
    };
  }
}
