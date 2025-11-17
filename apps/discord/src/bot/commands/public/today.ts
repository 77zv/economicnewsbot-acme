import { ChatInputCommandInteraction } from "discord.js";
import { Currency, Impact, Timezone, Market, parseEnumArray } from '@repo/api'
import { newsService } from '@repo/api'
import { buildNewsEmbed } from "../../utils/embedBuilder.js"
import { CommandBuilder } from "../../utils/commandBuilder.js"

export const data = new CommandBuilder("today", "Get today's news and events")
  .addMarketOption()
  .addCurrencyOption()
  .addImpactOption()
  .addTimezoneOption()
  .build();

export async function execute(interaction: ChatInputCommandInteraction) {
  const market = interaction.options.get("market")?.value as Market || Market.FOREX;
  const currencyInput = interaction.options.get("currency")?.value as string;
  const impactInput = interaction.options.get("impact")?.value as string;
  const timezone = interaction.options.get("timezone")?.value as Timezone || undefined;

  const currencies = parseEnumArray(currencyInput, Object.values(Currency));
  const impacts = parseEnumArray(impactInput, Object.values(Impact));

  const news = await newsService.getTodayNews({
    market,
    currency: currencies,
    impact: impacts,
    timezone,
  });

  const embeds = buildNewsEmbed(news, "Forex News Today");
  await interaction.reply({ embeds: [embeds[0]!] });
  for (let i = 1; i < embeds.length; i++) {
    await interaction.followUp({ embeds: [embeds[i]!] });
  }
}