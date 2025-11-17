import prisma from "@repo/db";

import type { DiscordChannel } from '../models/index.js'

export type CreateDiscordChannelDTO = Omit<DiscordChannel, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateDiscordChannelDTO = Partial<CreateDiscordChannelDTO>

export class PrismaChannelRepository {
  async findById(id: string): Promise<DiscordChannel | null> {
    const result = await prisma.discordChannel.findUnique({
      where: { id },
    });
    return result;
  }

  async findByChannelId(channelId: string): Promise<DiscordChannel | null> {
    const result = await prisma.discordChannel.findUnique({
      where: { channelId },
    });
    return result;
  }

  async findByServerId(serverId: string): Promise<DiscordChannel[]> {
    const results = await prisma.discordChannel.findMany({
      where: { serverId },
    });
    return results;
  }

  async create(data: CreateDiscordChannelDTO): Promise<DiscordChannel> {
    const result = await prisma.discordChannel.create({ data });
    return result;
  }

  async update(
    id: string,
    data: UpdateDiscordChannelDTO
  ): Promise<DiscordChannel> {
    const result = await prisma.discordChannel.update({
      where: { id },
      data,
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    await prisma.discordChannel.delete({
      where: { id },
    });
  }

  async deleteMany(serverId: string): Promise<void> {
    await prisma.discordChannel.deleteMany({
      where: { serverId },
    });
  }
}
