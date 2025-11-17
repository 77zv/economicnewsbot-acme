import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { NewsAlertService, AlertType } from "@repo/api";
import { CommandBuilder } from "../../utils/commandBuilder.js";

const newsAlertService = NewsAlertService.getInstance();

export const data = new CommandBuilder("list-alerts", "List all news alerts for this server")
  .setAdminOnly()
  .build();

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "This command can only be used in a server.",
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

  const serverId = interaction.guildId;

  try {
    await interaction.deferReply({ ephemeral: true });

    const alerts = await newsAlertService.listNewsAlertsForServer(serverId);

    if (alerts.length === 0) {
      await interaction.editReply({
        content: "No news alerts found for this server. Use `/create-alert` to create one.",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`News Alerts for ${interaction.guild?.name}`)
      .setDescription(`Total alerts: ${alerts.length}`)
      .setTimestamp();

    for (const alert of alerts) {
      const alertTypes = alert.alertType.map((type: string) => {
        switch(type) {
          case AlertType.FIVE_MINUTES_BEFORE:
            return "5 min before";
          case AlertType.ON_NEWS_DROP:
            return "On drop";
          default:
            return type;
        }
      }).join(", ");

      embed.addFields({
        name: `Alert for <#${alert.channelId}>`,
        value: [
          `**Impact:** ${alert.impact.length > 0 ? alert.impact.join(", ") : "All"}`,
          `**Currency:** ${alert.currency.length > 0 ? alert.currency.join(", ") : "All"}`,
          `**Alert Types:** ${alertTypes}`,
          `**ID:** \`${alert.id}\``,
        ].join("\n"),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error listing alerts:', error);
    await interaction.editReply({
      content: `Failed to list alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

