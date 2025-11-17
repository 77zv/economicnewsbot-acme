import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { ScheduleService } from "@repo/api";
import { buildScheduleConfirmationEmbed } from "../../utils/scheduleEmbedBuilder.js";
import { CommandBuilder } from "../../utils/commandBuilder.js";
import {
  Impact,
  Currency,
  parseEnumArray
} from "@repo/api";

const scheduleService = ScheduleService.getInstance();

export const data = new CommandBuilder("edit-schedule", "Edit an existing schedule")
  .setAdminOnly()
  .addScheduleIdOption()
  .addHourOption()
  .addMinuteOption()
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

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "You need Administrator permissions to use this command.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const scheduleId = interaction.options.get("id")?.value as string;
    const hour = interaction.options.get("hour")?.value as number;
    const minute = interaction.options.get("minute")?.value as number;
    
    let updateData: any = {};
    
    if (hour !== undefined) {
      updateData.hour = hour;
    }
    if (minute !== undefined) {
      updateData.minute = minute;
    }
    
    const fields = ['timezone', 'newsscope', 'frequency', 'impact', 'currency', 'market'];
    fields.forEach(field => {
      const value = interaction.options.get(field)?.value;
      if (value !== undefined) {
        if (field === 'impact' || field === 'currency') {
          updateData[field] = parseEnumArray(value as string, 
            field === 'impact' ? Object.values(Impact) : Object.values(Currency));
        } else {
          updateData[field] = value;
        }
      }
    });

    const result = await scheduleService.editSchedule(scheduleId, updateData);
    
    const embed = buildScheduleConfirmationEmbed(result.schedule, "Updated");
    
    if (result.merged) {
      await interaction.editReply({ 
        content: "A schedule with this time already existed. The schedules have been merged.",
        embeds: [embed] 
      });
    } else {
      await interaction.editReply({ embeds: [embed] });
    }

  } catch (error) {
    console.error('Error editing schedule:', error);
    await interaction.editReply({ 
      content: `Failed to edit schedule`
    });
  }
}
