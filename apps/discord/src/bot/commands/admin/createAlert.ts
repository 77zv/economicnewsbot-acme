import { ChatInputCommandInteraction, ChannelType, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { NewsAlertService, Impact, Currency, AlertType, parseEnumArray } from "@repo/api";
import { CommandBuilder } from "../../utils/CommandBuilder.js";

const newsAlertService = NewsAlertService.getInstance();

export const data = new CommandBuilder("create-alert", "Create a news alert for this channel")
  .setAdminOnly()
  .addImpactOption()
  .addCurrencyOption()
  .addAlertTypeOption()
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
  const channelId = interaction.channelId;
  const channelType = interaction.channel?.type;
  const impact = interaction.options.get("impact")?.value as string || "";
  const currency = interaction.options.get("currency")?.value as string || "";
  const alertType = interaction.options.get("alert_type")?.value as string || "";

  const currencies = parseEnumArray(currency, Object.values(Currency));
  const impacts = parseEnumArray(impact, Object.values(Impact));
  const parsedAlertTypes = parseEnumArray(alertType, Object.values(AlertType));
  
  // Default to both alert types if none specified
  const alertTypes = parsedAlertTypes.length > 0 
    ? parsedAlertTypes 
    : [AlertType.FIVE_MINUTES_BEFORE, AlertType.ON_NEWS_DROP];

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

    const alert = await newsAlertService.createNewsAlert({
      serverId,
      channelId,
      impact: impacts,
      currency: currencies,
      alertType: alertTypes,
    });

    const embed = buildAlertConfirmationEmbed(alert);
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error creating alert:', error);
    await interaction.editReply({ 
      content: `Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`, 
    });
  }
}

function buildAlertConfirmationEmbed(alert: any): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle("✅ Alert Created Successfully")
    .setDescription(`News alert has been configured for <#${alert.channelId}>`)
    .addFields(
      {
        name: "Impact Levels",
        value: alert.impact.length > 0 ? alert.impact.join(", ") : "All",
        inline: true,
      },
      {
        name: "Currencies",
        value: alert.currency.length > 0 ? alert.currency.join(", ") : "All",
        inline: true,
      },
      {
        name: "Alert Types",
        value: alert.alertType.map((type: string) => {
          switch(type) {
            case AlertType.FIVE_MINUTES_BEFORE:
              return "5 minutes before";
            case AlertType.ON_NEWS_DROP:
              return "On news drop";
            default:
              return type;
          }
        }).join(", "),
        inline: false,
      }
    )
    .setFooter({ text: `Alert ID: ${alert.id}` })
    .setTimestamp();

  return embed;
}

