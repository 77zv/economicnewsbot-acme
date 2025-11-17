import type { NewsAlert } from "../models/index.js";
import prisma from "@repo/db";

export type CreateNewsAlertDTO = Omit<
  NewsAlert,
  "id" | "createdAt"
>;

export type UpdateNewsAlertDTO = Partial<CreateNewsAlertDTO>;

export class PrismaNewsAlertRepository {
  async findById(id: string): Promise<NewsAlert | null> {
    const result = await prisma.newsAlert.findUnique({
      where: { id },
    });
    return result;
  }

  async findByServerId(serverId: string): Promise<NewsAlert[]> {
    const results = await prisma.newsAlert.findMany({
      where: { serverId },
    });
    return results;
  }

  async findByChannelId(channelId: string): Promise<NewsAlert | null> {
    const result = await prisma.newsAlert.findFirst({
      where: { channelId },
    });
    return result;
  }

  async findByServerIdAndChannelId(
    serverId: string,
    channelId: string
  ): Promise<NewsAlert | null> {
    const result = await prisma.newsAlert.findFirst({
      where: { serverId, channelId },
    });
    return result;
  }

  async create(data: CreateNewsAlertDTO): Promise<NewsAlert> {
    const result = await prisma.newsAlert.create({ data });
    return result;
  }

  async update(id: string, data: UpdateNewsAlertDTO): Promise<NewsAlert> {
    const result = await prisma.newsAlert.update({
      where: { id },
      data,
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    await prisma.newsAlert.delete({
      where: { id },
    });
  }

  async deleteMany(serverId: string): Promise<number> {
    const result = await prisma.newsAlert.deleteMany({
      where: { serverId },
    });
    return result.count;
  }

  async findAll(): Promise<NewsAlert[]> {
    const results = await prisma.newsAlert.findMany();
    return results;
  }
}

