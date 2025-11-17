import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  PermissionFlagsBits,
  ComponentType
} from "discord.js";
import { ScheduleService } from "@repo/api";
import { buildScheduleListEmbed } from "../../utils/scheduleListEmbedBuilder.js";

const scheduleService = ScheduleService.getInstance();

export const data = new SlashCommandBuilder()
  .setName("list-schedules")
  .setDescription("List all schedules for this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const serverId = interaction.guildId;
    let schedules = await scheduleService.listSchedulesForServer(serverId);

    if (schedules.length === 0) {
      await interaction.editReply({
        content: "No schedules found for this server.",
      });
      return;
    }

    const embed = buildScheduleListEmbed(schedules);
    
    // Create delete buttons for each schedule (max 5 per row, max 25 buttons total)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const chunkedSchedules = [];
    for (let i = 0; i < schedules.length && i < 25; i += 5) {
      chunkedSchedules.push(schedules.slice(i, i + 5));
    }

    for (let i = 0; i < chunkedSchedules.length; i++) {
      const chunk = chunkedSchedules[i]!;
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let j = 0; j < chunk.length; j++) {
        const schedule = chunk[j]!;
        const scheduleIndex = i * 5 + j + 1;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`delete_schedule_${schedule.id}`)
            .setLabel(`Delete #${scheduleIndex}`)
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
          content: "You cannot delete schedules from someone else's list.",
          ephemeral: true,
        });
        return;
      }

      const scheduleId = buttonInteraction.customId.replace('delete_schedule_', '');
      
      try {
        await buttonInteraction.deferUpdate();
        
        // Delete the schedule
        await scheduleService.deleteSchedule(scheduleId);
        
        // Refresh the list
        schedules = await scheduleService.listSchedulesForServer(serverId);
        
        if (schedules.length === 0) {
          await buttonInteraction.editReply({
            content: "✅ Schedule deleted! No schedules remaining for this server.",
            embeds: [],
            components: []
          });
          collector.stop();
          return;
        }

        // Rebuild embed and buttons
        const newEmbed = buildScheduleListEmbed(schedules);
        const newRows: ActionRowBuilder<ButtonBuilder>[] = [];
        const newChunkedSchedules = [];
        for (let i = 0; i < schedules.length && i < 25; i += 5) {
          newChunkedSchedules.push(schedules.slice(i, i + 5));
        }

        for (let i = 0; i < newChunkedSchedules.length; i++) {
          const chunk = newChunkedSchedules[i]!;
          const row = new ActionRowBuilder<ButtonBuilder>();
          for (let j = 0; j < chunk.length; j++) {
            const schedule = chunk[j]!;
            const scheduleIndex = i * 5 + j + 1;
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`delete_schedule_${schedule.id}`)
                .setLabel(`Delete #${scheduleIndex}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🗑️")
            );
          }
          newRows.push(row);
        }

        await buttonInteraction.editReply({
          content: "✅ Schedule deleted successfully!",
          embeds: [newEmbed],
          components: newRows
        });

      } catch (error) {
        console.error('Error deleting schedule:', error);
        await buttonInteraction.editReply({
          content: "❌ Failed to delete schedule. Please try again.",
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
    console.error('Error listing schedules:', error);
    await interaction.editReply({ 
      content: "Failed to list schedules. Please try again later."
    });
  }
}
