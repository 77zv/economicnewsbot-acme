import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { Currency, Impact, Market, Timezone, NewsScope, Frequency, TimeDisplay, AlertType } from '@repo/api';

export class CommandBuilder {
  private command: SlashCommandBuilder;

  constructor(name: string, description: string) {
    this.command = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description);
  }

  setAdminOnly(): CommandBuilder {
    this.command.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    return this;
  }

  addHourOption(required: boolean = false): CommandBuilder {
    this.command.addIntegerOption(option =>
      option
        .setName("hour")
        .setDescription("Hour to send the schedule (00-23)")
        .setRequired(required)
        .addChoices(
          ...Array.from({ length: 24 }, (_, i) => ({
            name: i.toString().padStart(2, '0'),
            value: parseInt(i.toString().padStart(2, '0')),
          }))
        )
    );
    return this;
  }

  addMinuteOption(required: boolean = false): CommandBuilder {
    this.command.addIntegerOption(option =>
      option
        .setName("minute")
        .setDescription("Minute to send the schedule (00-55 in increments of 5)")
        .setRequired(required)
        .addChoices(
          ...Array.from({ length: 12 }, (_, i) => ({
            name: (i * 5).toString().padStart(2, '0'),
            value: parseInt((i * 5).toString().padStart(2, '0')),
          }))
        )
    );
    return this;
  }

  addNewsScopeOption(): CommandBuilder {
    this.command.addStringOption(option =>
      option
        .setName("newsscope")
        .setDescription("News scope (default: today)")
        .setRequired(false)
        .addChoices(
          { name: "Daily", value: NewsScope.DAILY },
          { name: "Weekly", value: NewsScope.WEEKLY },
          { name: "Tomorrow", value: NewsScope.TOMORROW }
        )
    );
    return this;
  }

  addFrequencyOption(): CommandBuilder {
    this.command.addStringOption(option =>
      option
        .setName("frequency")
        .setDescription("Frequency of the schedule (default: daily)")
        .setRequired(false)
        .addChoices(
          { name: "Daily", value: Frequency.DAILY },
          { name: "Weekdays", value: Frequency.WEEKDAYS },
          { name: "Weekends", value: Frequency.WEEKENDS },
          { name: "Weekly", value: Frequency.WEEKLY },
        )
    );
    return this;
  }

  addScheduleIdOption(): CommandBuilder {
    this.command.addStringOption(option =>
      option
        .setName("id")
        .setDescription("The ID of the schedule to edit")
        .setRequired(true)
    );
    return this;
  }

  addMarketOption(): CommandBuilder {
    this.command.addStringOption(option =>
      option
        .setName("market")
        .setDescription("Filter by market type (default: Forex)")
        .setRequired(false)
        .addChoices(
          { name: "Forex", value: Market.FOREX },
          { name: "Crypto", value: Market.CRYPTO },
          { name: "Energy", value: Market.ENERGY },
          { name: "Metal", value: Market.METAL }
        )
    );
    return this;
  }

  addCurrencyOption(): CommandBuilder {
    const currencyOptions = Object.values(Currency).join(', ');
    this.command.addStringOption(option =>
      option
        .setName("currency")
        .setDescription(`Filter by currencies (comma-separated, e.g., ${currencyOptions})`)
        .setRequired(false)
    );
    return this;
  }

  addImpactOption(): CommandBuilder {
    const impactOptions = Object.values(Impact).join(', ');
    this.command.addStringOption(option =>
      option
        .setName("impact")
        .setDescription(`Filter by impact levels (comma-separated, e.g., ${impactOptions})`)
        .setRequired(false)
    );
    return this;
  }

  addTimezoneOption(): CommandBuilder {
    this.command.addStringOption(option =>
      option
        .setName("timezone")
        .setDescription("Your timezone (default: New York Time)")
        .setRequired(false)
        .addChoices(
          { name: "GMT+0", value: Timezone.GMT_P0 },
          { name: "GMT+1", value: Timezone.GMT_P1 },
          { name: "GMT+2", value: Timezone.GMT_P2 },
          { name: "GMT+3", value: Timezone.GMT_P3 },
          { name: "GMT+4", value: Timezone.GMT_P4 },
          { name: "GMT+5", value: Timezone.GMT_P5 },
          { name: "GMT+6", value: Timezone.GMT_P6 },
          { name: "GMT+7", value: Timezone.GMT_P7 },
          { name: "GMT+8", value: Timezone.GMT_P8 },
          { name: "GMT+9", value: Timezone.GMT_P9 },
          { name: "GMT+10", value: Timezone.GMT_P10 },
          { name: "GMT+11", value: Timezone.GMT_P11 },
          { name: "GMT+12", value: Timezone.GMT_P12 },
          { name: "GMT-1", value: Timezone.GMT_N1 },
          { name: "GMT-2", value: Timezone.GMT_N2 },
          { name: "GMT-3", value: Timezone.GMT_N3 },
          { name: "GMT-4", value: Timezone.GMT_N4 },
          { name: "GMT-5", value: Timezone.GMT_N5 },
          { name: "GMT-6", value: Timezone.GMT_N6 },
          { name: "GMT-7", value: Timezone.GMT_N7 },
          { name: "GMT-8", value: Timezone.GMT_N8 },
          { name: "GMT-9", value: Timezone.GMT_N9 },
          { name: "GMT-10", value: Timezone.GMT_N10 },
          { name: "GMT-11", value: Timezone.GMT_N11 },
          { name: "GMT-12", value: Timezone.GMT_N12 }
        )
    );
    return this;
  }

  addTimeDisplayOption(): CommandBuilder {
    this.command.addStringOption(option =>
      option
        .setName("time_display")
        .setDescription("Display news times in relative format to each users system, or fixed format (e.g., '14:30 UTC+1')")
        .setRequired(false)
        .addChoices(
          { name: "Fixed", value: TimeDisplay.FIXED },
          // { name: "Relative", value: TimeDisplay.RELATIVE }
        )
      );
    return this;
  }

  addMentionOption(): CommandBuilder {
    this.command.addStringOption(option =>
      option
        .setName("mention")
        .setDescription("Who to mention (@everyone or role ID)")
        .setRequired(false)
    );
    return this;
  }

  addAlertTypeOption(): CommandBuilder {
    const alertTypeOptions = Object.values(AlertType).join(', ');
    this.command.addStringOption(option =>
      option
        .setName("alert_type")
        .setDescription(`Alert timing options (comma-separated, e.g., ${alertTypeOptions})`)
        .setRequired(false)
    );
    return this;
  }

  build(): SlashCommandBuilder {
    return this.command;
  }
} 