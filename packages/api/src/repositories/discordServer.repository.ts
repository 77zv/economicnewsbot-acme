import prisma from "@repo/db";
import type { DiscordServer} from '../models/index.js'

export type CreateDiscordServerDTO = Omit<DiscordServer, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateDiscordServerDTO = Partial<CreateDiscordServerDTO>

export class PrismaServerRepository {
  async findById(id: string): Promise<DiscordServer | null> {
    const result = await prisma.discordServer.findUnique({
      where: { id },
    });
    return result;
  }

  async findByGuildId(guildId: string): Promise<DiscordServer | null> {
    const result = await prisma.discordServer.findUnique({
      where: { guildId },
    });
    return result;
  }

  async create(data: CreateDiscordServerDTO): Promise<DiscordServer> {
    const result = await prisma.discordServer.create({ data });
    return result;
  }

  async update(
    id: string,
    data: UpdateDiscordServerDTO
  ): Promise<DiscordServer> {
    const result = await prisma.discordServer.update({
      where: { id },
      data,
    });
    return result;
  }

  async delete(id: string): Promise<void> {
    await prisma.discordServer.delete({
      where: { id },
    });
  }
}
