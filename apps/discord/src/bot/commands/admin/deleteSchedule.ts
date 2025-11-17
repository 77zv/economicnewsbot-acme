import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getFormattedTime } from "../../utils/embedBuilder.js";
import { ScheduleService } from "@repo/api";
import { buildScheduleConfirmationEmbed } from "../../utils/scheduleEmbedBuilder.js";
import { PermissionFlagsBits } from "discord.js";

const scheduleService = ScheduleService.getInstance();

export const data = new SlashCommandBuilder()
  .setName("delete-schedule")
  .setDescription("Delete a schedule")
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
    const schedules = await scheduleService.listSchedulesForServer(
      interaction.guildId
    );

    if (schedules.length === 0) {
      await interaction.reply({
        content: "No schedules found for this server.",
        ephemeral: true,
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("schedule")
      .setPlaceholder("Select a schedule to delete")
      .addOptions(
        schedules.map((schedule) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${getFormattedTime(new Date(schedule.createdAt), schedule.timeDisplay)} - ${schedule.market}`)
            .setDescription(
              `Channel: #${interaction.guild?.channels.cache.get(schedule.channelId)?.name}`
            )
            .setValue(schedule.id)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      select
    );

    const response = await interaction.reply({
      content: "Please select the schedule you want to delete:",
      components: [row],
      ephemeral: true,
    });

    try {
      const selection = await response.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
        componentType: ComponentType.StringSelect,
      });

      const scheduleId = selection.values[0];

      // Create confirmation buttons
      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm")
          .setLabel("Delete Schedule")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      await selection.update({
        content: "Are you sure you want to delete this schedule?",
        components: [confirmRow],
      });

      const confirmation = await response.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
        componentType: ComponentType.Button,
      });

      if (confirmation.customId === "confirm") {
        const schedule = await scheduleService.deleteSchedule(scheduleId!);
        const embed = buildScheduleConfirmationEmbed(schedule, "Deleted");
        await confirmation.update({
          content: "Schedule deleted",
          embeds: [embed],
          components: [],
        });
      } else {
        await confirmation.update({
          content: "Operation cancelled.",
          components: [],
        });
      }
    } catch (e) {
      await interaction.editReply({
        content: "No response received within 30 seconds, operation cancelled.",
        components: [],
      });
    }
  } catch (error) {
    console.error("Error in delete-schedule:", error);
    await interaction.editReply({
      content: "An error occurred while trying to delete the schedule.",
      components: [],
    });
  }
}
