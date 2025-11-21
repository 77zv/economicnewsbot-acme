import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { NewsAlertService, Impact, Currency, AlertType, parseEnumArray } from "@repo/api";
import { CommandBuilder } from "../../utils/commandBuilder.js";

const newsAlertService = NewsAlertService.getInstance();

export const data = new CommandBuilder("edit-alert", "Edit an existing news alert")
  .setAdminOnly()
  .addScheduleIdOption()
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

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "You need Administrator permissions to use this command.",
      ephemeral: true,
    });
    return;
  }

  const alertId = interaction.options.get("id")?.value as string;
  const impact = interaction.options.get("impact")?.value as string;
  const currency = interaction.options.get("currency")?.value as string;
  const alertType = interaction.options.get("alert_type")?.value as string;

  // Build update object with only provided fields
  const updateData: any = {};

  if (impact !== undefined) {
    const impacts = parseEnumArray(impact, Object.values(Impact));
    updateData.impact = impacts;
  }

  if (currency !== undefined) {
    const currencies = parseEnumArray(currency, Object.values(Currency));
    updateData.currency = currencies;
  }

  if (alertType !== undefined) {
    const alertTypes = parseEnumArray(alertType, Object.values(AlertType));
    updateData.alertType = alertTypes;
  }

  if (Object.keys(updateData).length === 0) {
    await interaction.reply({
      content: "Please provide at least one field to update (impact, currency, or alert_type).",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    // Fetch the alert to check its channel
    const existingAlert = await newsAlertService.getNewsAlertById(alertId);
    if (!existingAlert) {
      await interaction.editReply({
        content: "❌ Alert not found.",
      });
      return;
    }
    
    // Check if bot has required permissions in the alert's channel
    try {
      const channel = await interaction.guild?.channels.fetch(existingAlert.channelId);
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
            content: `### ❌ Missing Permissions\n\nI need the following permissions in <#${existingAlert.channelId}> to send news alerts:\n\n${permissionNames.map(name => `> ${name}`).join('\n')}\n\n*Please enable these permissions and try again.*`,
          });
          return;
        }
      }
    } catch (error) {
      // Channel might have been deleted, let the edit proceed anyway
      console.warn(`Could not fetch channel ${existingAlert.channelId} for permission check:`, error);
    }

    const updatedAlert = await newsAlertService.updateNewsAlert(alertId, updateData);

    const alertTypes = updatedAlert.alertType.map((type: string) => {
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
      .setColor(0xFFA500)
      .setTitle("✏️ Alert Updated")
      .setDescription(`News alert has been updated for <#${updatedAlert.channelId}>`)
      .addFields(
        {
          name: "Impact Levels",
          value: updatedAlert.impact.length > 0 ? updatedAlert.impact.join(", ") : "All",
          inline: true,
        },
        {
          name: "Currencies",
          value: updatedAlert.currency.length > 0 ? updatedAlert.currency.join(", ") : "All",
          inline: true,
        },
        {
          name: "Alert Types",
          value: alertTypes,
          inline: false,
        }
      )
      .setFooter({ text: `Alert ID: ${updatedAlert.id}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error editing alert:', error);
    await interaction.editReply({
      content: `Failed to edit alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

