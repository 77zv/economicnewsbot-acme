import type { Schedule } from "../models/index.js";
import prisma from "@repo/db";

export type CreateScheduleDTO = Omit<
  Schedule,
  "id" | "createdAt" | "updatedAt"
>;
export type CreateScheduleWithoutServerTime = Omit<
  Schedule,
  "id" | "createdAt" | "updatedAt" | "hourServerTime" | "minuteServerTime"
>;
export type CreateScheduleDTOWithServerTime = Omit<
  Schedule,
  "id" | "createdAt" | "updatedAt"
> & {
  hourServerTime: number;
  minuteServerTime: number;
};



export type UpdateScheduleDTO = Partial<CreateScheduleDTO>;

export class PrismaScheduleRepository {
  async findById(id: string): Promise<Schedule | null> {
    const result = await prisma.schedule.findUnique({
      where: { id },
    });
    return result;
  }

  async findByServerId(serverId: string): Promise<Schedule[]> {
    const results = await prisma.schedule.findMany({
      where: { serverId },
    });
    return results;
  }

  async findByChannelIdServerIdHourMinute({
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
    const result = await prisma.schedule.findFirst({
      where: { channelId, serverId, hour, minute },
    });
    return result;
  }

  async create(data: CreateScheduleDTO): Promise<Schedule> {
    const result = await prisma.schedule.create({ data });
    return result;
  }

  async update(id: string, data: UpdateScheduleDTO): Promise<Schedule> {
    const result = await prisma.schedule.update({
      where: { id },
      data,
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    await prisma.schedule.delete({
      where: { id },
    });
  }

  async deleteMany(serverId: string): Promise<number> {
    const result = await prisma.schedule.deleteMany({
      where: { serverId },
    });
    return result.count;
  }

  async findByHour(hour: number): Promise<Schedule[]> {
    const results = await prisma.schedule.findMany({
      where: { hour },
    });
    return results;
  }

  async findByHourAndMinute(hour: number, minute: number): Promise<Schedule[]> {
    const results = await prisma.schedule.findMany({
      where: {
        hourServerTime: hour,
        minuteServerTime: minute,
      },
    });
    return results;
  }
}
