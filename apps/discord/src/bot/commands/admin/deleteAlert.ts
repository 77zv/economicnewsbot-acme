import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { NewsAlertService, AlertType } from "@repo/api";
import { CommandBuilder } from "../../utils/commandBuilder.js";

const newsAlertService = NewsAlertService.getInstance();

export const data = new CommandBuilder("delete-alert", "Delete a news alert")
  .setAdminOnly()
  .addScheduleIdOption()
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

  const alertId = interaction.options.get("id")?.value as string;

  try {
    await interaction.deferReply({ ephemeral: true });

    const deletedAlert = await newsAlertService.deleteNewsAlert(alertId);

    const alertTypes = deletedAlert.alertType.map((type: string) => {
      switch(type) {
        case AlertType.FIVE_MINUTES_BEFORE:
          return "5 minutes before";
        case AlertType.ON_NEWS_DROP:
          return "On news drop";
        default:
          return type;
      }
    }).join(", ");

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle("🗑️ Alert Deleted")
      .setDescription(`News alert has been removed from <#${deletedAlert.channelId}>`)
      .addFields(
        {
          name: "Impact Levels",
          value: deletedAlert.impact.length > 0 ? deletedAlert.impact.join(", ") : "All",
          inline: true,
        },
        {
          name: "Currencies",
          value: deletedAlert.currency.length > 0 ? deletedAlert.currency.join(", ") : "All",
          inline: true,
        },
        {
          name: "Alert Types",
          value: alertTypes,
          inline: false,
        }
      )
      .setFooter({ text: `Alert ID: ${deletedAlert.id}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error deleting alert:', error);
    await interaction.editReply({
      content: `Failed to delete alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

