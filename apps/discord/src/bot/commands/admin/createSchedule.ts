import { ChatInputCommandInteraction, ChannelType, PermissionFlagsBits } from "discord.js";
import { ScheduleService } from "@repo/api";
import { buildScheduleConfirmationEmbed } from "../../utils/scheduleEmbedBuilder.js";
import { CommandBuilder } from "../../utils/CommandBuilder.js";
import {
  Timezone,
  NewsScope,
  Frequency,
  Impact,
  Currency,
  Market,
  parseEnumArray,
  TimeDisplay
} from "@repo/api";

const scheduleService = ScheduleService.getInstance();

export const data = new CommandBuilder("create-schedule", "Create a new schedule")
  .setAdminOnly()
  .addHourOption(true)
  .addMinuteOption(true)
  .addTimezoneOption()
  // .addNewsScopeOption()
  // .addFrequencyOption()
  .addImpactOption()
  .addCurrencyOption()
  .addMarketOption()
  // .addTimeDisplayOption()
  .build();

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }
  const serverId = interaction.guildId;
  const userId = interaction.user.id;
  const channelId = interaction.channelId;
  const channelType = interaction.channel?.type;
  const timeZone = interaction.options.get("timezone")?.value as Timezone || Timezone.DEFAULT;
  const newsScope = interaction.options.get("newsscope")?.value as NewsScope || NewsScope.DAILY;
  const frequency = interaction.options.get("frequency")?.value as Frequency || Frequency.DAILY;
  const impact = interaction.options.get("impact")?.value as string || "";
  const currency = interaction.options.get("currency")?.value as string || "";
  const market = interaction.options.get("market")?.value as Market || Market.FOREX;
  const hour = interaction.options.get("hour")?.value as string;
  const minute = interaction.options.get("minute")?.value as string;
  const timeDisplay = interaction.options.get("time_display")?.value as TimeDisplay || TimeDisplay.FIXED;

  const currencies = parseEnumArray(currency, Object.values(Currency));
  const impacts = parseEnumArray(impact, Object.values(Impact));

  if (channelType !== ChannelType.GuildText && channelType !== ChannelType.GuildAnnouncement) {
    await interaction.reply({
      content: "This command can only be used in a text or announcement channel.",
      ephemeral: true,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "You need Administrator permissions to use this command.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const schedule = await scheduleService.createSchedule({
      serverId,
      channelId,
      timeZone,
      newsScope,
      frequency,
      impact: impacts,
      currency: currencies,
      market,
      hour: parseInt(hour),
      minute: parseInt(minute),
      timeDisplay: timeDisplay
    });

    const embed = buildScheduleConfirmationEmbed(schedule, "Created");
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error creating schedule:', error);
    await interaction.editReply({ 
      content: `Failed to create schedule`, 
    });
  }
}
