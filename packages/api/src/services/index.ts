import { NewsService } from '../services/news.service.js'
import { DiscordService } from '../services/discord.service.js'
import { GrokService } from '../services/grok.service.js'

// Export singleton instances
export const newsService = NewsService.getInstance()
export const discordService = DiscordService.getInstance()
export const grokService = GrokService.getInstance()

// Export types and interfaces
export type { NewsOptions } from '../services/news.service.js'
export type { DiscordGuild, GuildWithBot } from '../services/discord.service.js'

