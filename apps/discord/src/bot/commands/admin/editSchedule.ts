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
    
    // Fetch the schedule to check its channel
    const existingSchedule = await scheduleService.getScheduleById(scheduleId);
    if (!existingSchedule) {
      await interaction.editReply({
        content: "❌ Schedule not found.",
      });
      return;
    }
    
    // Check if bot has required permissions in the schedule's channel
    try {
      const channel = await interaction.guild?.channels.fetch(existingSchedule.channelId);
      if (channel && channel.isTextBased()) {
        const botMember = interaction.guild?.members.me;
        const botPermissions = channel.permissionsFor(botMember!);
        
        const requiredPermissions = [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks
        ];
        
        const missingPermissions = requiredPermissions.filter(perm => !botPermissions?.has(perm));
        
        if (missingPermissions.length > 0) {
          const permissionNames = missingPermissions.map(perm => {
            if (perm === PermissionFlagsBits.ViewChannel) return "👁️ View Channel";
            if (perm === PermissionFlagsBits.SendMessages) return "💬 Send Messages";
            if (perm === PermissionFlagsBits.EmbedLinks) return "🔗 Embed Links";
            return "Unknown";
          });
          
          await interaction.editReply({
            content: `### ❌ Missing Permissions\n\nI need the following permissions in <#${existingSchedule.channelId}> to send scheduled news:\n\n${permissionNames.map(name => `> ${name}`).join('\n')}\n\n*Please enable these permissions and try again.*`,
          });
          return;
        }
      }
    } catch (error) {
      // Channel might have been deleted, let the edit proceed anyway
      console.warn(`Could not fetch channel ${existingSchedule.channelId} for permission check:`, error);
    }
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
      content: `Failed to edit schedule: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
