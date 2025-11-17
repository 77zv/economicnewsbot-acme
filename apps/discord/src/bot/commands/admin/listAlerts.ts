import { 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from "discord.js";
import { NewsAlertService, AlertType } from "@repo/api";
import { CommandBuilder } from "../../utils/commandBuilder.js";

const newsAlertService = NewsAlertService.getInstance();

export const data = new CommandBuilder("list-alerts", "List all news alerts for this server")
  .setAdminOnly()
  .build();

function buildAlertsEmbed(alerts: any[], guildName?: string) {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`News Alerts for ${guildName || 'Server'}`)
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

  return embed;
}

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

    let alerts = await newsAlertService.listNewsAlertsForServer(serverId);

    if (alerts.length === 0) {
      await interaction.editReply({
        content: "No news alerts found for this server. Use `/create-alert` to create one.",
      });
      return;
    }

    const embed = buildAlertsEmbed(alerts, interaction.guild?.name);

    // Create delete buttons for each alert (max 5 per row, max 25 buttons total)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const chunkedAlerts = [];
    for (let i = 0; i < alerts.length && i < 25; i += 5) {
      chunkedAlerts.push(alerts.slice(i, i + 5));
    }

    for (let i = 0; i < chunkedAlerts.length; i++) {
      const chunk = chunkedAlerts[i]!;
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let j = 0; j < chunk.length; j++) {
        const alert = chunk[j]!;
        const alertIndex = i * 5 + j + 1;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`delete_alert_${alert.id}`)
            .setLabel(`Delete #${alertIndex}`)
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🗑️")
        );
      }
      rows.push(row);
    }

    const message = await interaction.editReply({ 
      embeds: [embed],
      components: rows
    });

    // Create collector for button interactions
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000, // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      // Verify the user is the same one who ran the command
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: "You cannot delete alerts from someone else's list.",
          ephemeral: true,
        });
        return;
      }

      const alertId = buttonInteraction.customId.replace('delete_alert_', '');
      
      try {
        await buttonInteraction.deferUpdate();
        
        // Delete the alert
        await newsAlertService.deleteNewsAlert(alertId);
        
        // Refresh the list
        alerts = await newsAlertService.listNewsAlertsForServer(serverId);
        
        if (alerts.length === 0) {
          await buttonInteraction.editReply({
            content: "✅ Alert deleted! No alerts remaining for this server.",
            embeds: [],
            components: []
          });
          collector.stop();
          return;
        }

        // Rebuild embed and buttons
        const newEmbed = buildAlertsEmbed(alerts, interaction.guild?.name);
        const newRows: ActionRowBuilder<ButtonBuilder>[] = [];
        const newChunkedAlerts = [];
        for (let i = 0; i < alerts.length && i < 25; i += 5) {
          newChunkedAlerts.push(alerts.slice(i, i + 5));
        }

        for (let i = 0; i < newChunkedAlerts.length; i++) {
          const chunk = newChunkedAlerts[i]!;
          const row = new ActionRowBuilder<ButtonBuilder>();
          for (let j = 0; j < chunk.length; j++) {
            const alert = chunk[j]!;
            const alertIndex = i * 5 + j + 1;
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`delete_alert_${alert.id}`)
                .setLabel(`Delete #${alertIndex}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🗑️")
            );
          }
          newRows.push(row);
        }

        await buttonInteraction.editReply({
          content: "✅ Alert deleted successfully!",
          embeds: [newEmbed],
          components: newRows
        });

      } catch (error) {
        console.error('Error deleting alert:', error);
        await buttonInteraction.editReply({
          content: "❌ Failed to delete alert. Please try again.",
          embeds: [embed],
          components: rows
        });
      }
    });

    collector.on('end', async () => {
      // Disable all buttons when collector expires
      try {
        const disabledRows = rows.map(row => {
          const newRow = new ActionRowBuilder<ButtonBuilder>();
          row.components.forEach(button => {
            newRow.addComponents(
              ButtonBuilder.from(button).setDisabled(true)
            );
          });
          return newRow;
        });
        
        await interaction.editReply({ components: disabledRows });
      } catch (error) {
        // Message might have been deleted or edited, ignore
      }
    });

  } catch (error) {
    console.error('Error listing alerts:', error);
    await interaction.editReply({
      content: `Failed to list alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

