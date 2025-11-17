import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { ScheduleService } from "@repo/api";
import { buildScheduleListEmbed } from "../../utils/scheduleListEmbedBuilder.js";
import { PermissionFlagsBits } from "discord.js";

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
    const schedules = await scheduleService.listSchedulesForServer(serverId);

    if (schedules.length === 0) {
      await interaction.editReply({
        content: "No schedules found for this server.",
      });
      return;
    }

    const embed = buildScheduleListEmbed(schedules);
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error listing schedules:', error);
    await interaction.editReply({ 
      content: "Failed to list schedules. Please try again later."
    });
  }
}
