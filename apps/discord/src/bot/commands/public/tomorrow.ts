import { ChatInputCommandInteraction } from "discord.js";
import { Currency, Impact, Timezone, Market, parseEnumArray, TimeDisplay } from '@repo/api'
import { newsService } from '@repo/api'
import { buildNewsEmbed } from "../../utils/embedBuilder.js"
import { CommandBuilder } from "../../utils/CommandBuilder.js"

export const data = new CommandBuilder("tomorrow", "Get tomorrow's news and events")
  .addMarketOption()
  .addCurrencyOption()
  .addImpactOption()
  .addTimezoneOption()
  .addTimeDisplayOption()
  .build();

export async function execute(interaction: ChatInputCommandInteraction) {
  const market = interaction.options.get("market")?.value as Market || Market.FOREX;
  const currencyInput = interaction.options.get("currency")?.value as string;
  const impactInput = interaction.options.get("impact")?.value as string;
  const timezone = interaction.options.get("timezone")?.value as Timezone || undefined;
  const timeDisplay = interaction.options.get("time_display")?.value as TimeDisplay || TimeDisplay.FIXED;
  const currencies = parseEnumArray(currencyInput, Object.values(Currency));
  const impacts = parseEnumArray(impactInput, Object.values(Impact));

  const news = await newsService.getTomorrowNews({
    market,
    currency: currencies,
    impact: impacts,
    timezone
  });

  const embeds = buildNewsEmbed(news, "Forex News Tomorrow", timeDisplay);
  await interaction.reply({ embeds: [embeds[0]!] });
  for (let i = 1; i < embeds.length; i++) {
    await interaction.followUp({ embeds: [embeds[i]!] });
  }
}
