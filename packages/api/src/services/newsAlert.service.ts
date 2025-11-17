import type { CreateNewsAlertDTO } from "../repositories/newsAlert.repository.js";
import { PrismaNewsAlertRepository } from "../repositories/newsAlert.repository.js";
import type { UpdateNewsAlertDTO } from "../repositories/newsAlert.repository.js";
import { PrismaServerRepository } from "../repositories/discordServer.repository.js";
import { PrismaChannelRepository } from "../repositories/discordChannel.repository.js";
import type { DiscordChannel, DiscordServer, NewsAlert } from "@repo/db";

export class NewsAlertService {
  private static instance: NewsAlertService | null = null;
  private readonly newsAlertRepository: PrismaNewsAlertRepository;
  private readonly serverRepository: PrismaServerRepository;
  private readonly channelRepository: PrismaChannelRepository;

  private constructor() {
    this.newsAlertRepository = new PrismaNewsAlertRepository();
    this.serverRepository = new PrismaServerRepository();
    this.channelRepository = new PrismaChannelRepository();
  }

  public static getInstance(): NewsAlertService {
    if (!NewsAlertService.instance) {
      NewsAlertService.instance = new NewsAlertService();
    }
    return NewsAlertService.instance;
  }

  public async createNewsAlert(data: CreateNewsAlertDTO): Promise<NewsAlert> {
    try {
      // Check if server exists, create if not
      const serverExists = await this._checkServerExists(data.serverId);
      if (!serverExists) {
        await this.serverRepository.create({ guildId: data.serverId });
        console.log(
          `Server with id ${data.serverId} does not exist. It has been created to create a news alert.`
        );
      }

      // Check if channel exists, create if not
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
          `Channel with id ${data.channelId} does not exist. It has been created to create a news alert.`
        );
      }

      // Check if an alert already exists for this channel
      const existingAlert = await this.newsAlertRepository.findByServerIdAndChannelId(
        data.serverId,
        data.channelId
      );

      if (existingAlert) {
        // Update existing alert instead of creating a new one
        console.log(
          `News alert already exists for channel ${data.channelId}. Updating it.`
        );
        return await this.updateNewsAlert(existingAlert.id, data);
      }

      const newsAlert = await this.newsAlertRepository.create(data);
      console.log(
        `News alert with id ${newsAlert.id} has been created for the server ${data.serverId}.`
      );
      return newsAlert;
    } catch (error) {
      console.error("Error creating news alert:", error);
      throw new Error(`Failed to create news alert`);
    }
  }

  public async listNewsAlertsForServer(serverId: string): Promise<NewsAlert[]> {
    try {
      return await this.newsAlertRepository.findByServerId(serverId);
    } catch (error) {
      console.error("Error listing news alerts:", error);
      throw new Error(`Failed to list news alerts`);
    }
  }

  public async getNewsAlertByChannelId(
    channelId: string
  ): Promise<NewsAlert | null> {
    try {
      return await this.newsAlertRepository.findByChannelId(channelId);
    } catch (error) {
      console.error("Error getting news alert by channel:", error);
      throw new Error(`Failed to get news alert by channel ${channelId}`);
    }
  }

  public async updateNewsAlert(
    id: string,
    data: UpdateNewsAlertDTO
  ): Promise<NewsAlert> {
    try {
      const existingAlert = await this.newsAlertRepository.findById(id);
      if (!existingAlert) {
        throw new Error(`News alert with id ${id} not found`);
      }

      const updatedAlert = await this.newsAlertRepository.update(id, data);
      console.log(`News alert with id ${id} has been updated.`);
      return updatedAlert;
    } catch (error) {
      console.error("Error updating news alert:", error);
      throw new Error(`Failed to update news alert`);
    }
  }

  public async deleteNewsAlert(id: string): Promise<NewsAlert> {
    try {
      const existingAlert = await this.newsAlertRepository.findById(id);
      if (!existingAlert) {
        throw new Error(`News alert with id ${id} not found`);
      }

      await this.newsAlertRepository.delete(id);
      console.log(`News alert with id ${id} has been deleted.`);
      return existingAlert;
    } catch (error) {
      console.error("Error deleting news alert:", error);
      throw new Error(`Failed to delete news alert`);
    }
  }

  public async deleteAllNewsAlertsForServer(serverId: string): Promise<number> {
    try {
      const result = await this.newsAlertRepository.deleteMany(serverId);
      console.log(`Deleted ${result} news alerts for server ${serverId}.`);
      return result;
    } catch (error) {
      console.error("Error deleting all news alerts:", error);
      throw new Error(`Failed to delete all news alerts`);
    }
  }

  public async getAllNewsAlerts(): Promise<NewsAlert[]> {
    try {
      return await this.newsAlertRepository.findAll();
    } catch (error) {
      console.error("Error getting all news alerts:", error);
      throw new Error(`Failed to get all news alerts`);
    }
  }

  // For testing purposes
  public static resetInstance(): void {
    NewsAlertService.instance = null;
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
}

