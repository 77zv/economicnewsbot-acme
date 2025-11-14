"use client";

import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Timezone, 
  NewsScope, 
  Frequency, 
  Impact, 
  Currency, 
  Market,
  TimeDisplay,
  type Schedule
} from "@repo/db/types";

const scheduleSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59),
  timeZone: z.nativeEnum(Timezone),
  newsScope: z.nativeEnum(NewsScope),
  frequency: z.nativeEnum(Frequency),
  market: z.nativeEnum(Market),
  impact: z.array(z.nativeEnum(Impact)).min(1, "Select at least one impact level"),
  currency: z.array(z.nativeEnum(Currency)),
  timeDisplay: z.nativeEnum(TimeDisplay),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleFormProps {
  onSubmit: SubmitHandler<ScheduleFormData>;
  onCancel: () => void;
  defaultValues?: Partial<Schedule>;
  isLoading?: boolean;
}

export default function ScheduleForm({
  onSubmit,
  onCancel,
  defaultValues,
  isLoading = false,
}: ScheduleFormProps) {
  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaultValues ? {
      channelId: defaultValues.channelId ?? "",
      hour: defaultValues.hour ?? 9,
      minute: defaultValues.minute ?? 0,
      timeZone: defaultValues.timeZone ?? Timezone.DEFAULT,
      newsScope: defaultValues.newsScope ?? NewsScope.DAILY,
      frequency: defaultValues.frequency ?? Frequency.DAILY,
      market: defaultValues.market ?? Market.FOREX,
      impact: defaultValues.impact ?? [Impact.HIGH],
      currency: defaultValues.currency ?? [],
      timeDisplay: defaultValues.timeDisplay ?? TimeDisplay.FIXED,
    } : {
      channelId: "",
      hour: 9,
      minute: 0,
      timeZone: Timezone.DEFAULT,
      newsScope: NewsScope.DAILY,
      frequency: Frequency.DAILY,
      market: Market.FOREX,
      impact: [Impact.HIGH],
      currency: [],
      timeDisplay: TimeDisplay.FIXED,
    },
  });

  const { register, handleSubmit, control, formState } = form;
  const { errors } = formState;

  const toggleImpact = (impact: Impact, currentValues: Impact[]) => {
    if (currentValues.includes(impact)) {
      return currentValues.filter((i) => i !== impact);
    }
    return [...currentValues, impact];
  };

  const toggleCurrency = (currency: Currency, currentValues: Currency[]) => {
    if (currentValues.includes(currency)) {
      return currentValues.filter((c) => c !== currency);
    }
    return [...currentValues, currency];
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Channel ID */}
      <div>
        <label htmlFor="channelId" className="block text-sm font-medium text-white mb-2">
          Channel ID *
        </label>
        <input
          id="channelId"
          type="text"
          {...register("channelId")}
          className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white placeholder-background-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Enter Discord channel ID"
        />
        {errors.channelId && (
          <p className="mt-1 text-sm text-red-400">{errors.channelId.message as string}</p>
        )}
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="hour" className="block text-sm font-medium text-white mb-2">
            Hour (0-23) *
          </label>
          <input
            id="hour"
            type="number"
            {...register("hour", { valueAsNumber: true })}
            min="0"
            max="23"
            className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white placeholder-background-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.hour && (
            <p className="mt-1 text-sm text-red-400">{errors.hour.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="minute" className="block text-sm font-medium text-white mb-2">
            Minute (0-59) *
          </label>
          <input
            id="minute"
            type="number"
            {...register("minute", { valueAsNumber: true })}
            min="0"
            max="59"
            className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white placeholder-background-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.minute && (
            <p className="mt-1 text-sm text-red-400">{errors.minute.message}</p>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="timeZone" className="block text-sm font-medium text-white mb-2">
          Timezone *
        </label>
        <select
          id="timeZone"
          {...register("timeZone")}
          className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {Object.values(Timezone).map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Frequency */}
      <div>
        <label htmlFor="frequency" className="block text-sm font-medium text-white mb-2">
          Frequency *
        </label>
        <select
          id="frequency"
          {...register("frequency")}
          className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {Object.values(Frequency).map((freq) => (
            <option key={freq} value={freq}>
              {freq}
            </option>
          ))}
        </select>
      </div>

      {/* Market */}
      <div>
        <label htmlFor="market" className="block text-sm font-medium text-white mb-2">
          Market *
        </label>
        <select
          id="market"
          {...register("market")}
          className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {Object.values(Market).map((market) => (
            <option key={market} value={market}>
              {market}
            </option>
          ))}
        </select>
      </div>

      {/* Impact Levels */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Impact Levels * (Select at least one)
        </label>
        <Controller
          name="impact"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {Object.values(Impact).map((impact) => (
                <button
                  key={impact}
                  type="button"
                  onClick={() => field.onChange(toggleImpact(impact, field.value))}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    field.value.includes(impact)
                      ? "bg-primary-600 text-white border-2 border-primary-500"
                      : "bg-background-700 text-background-300 border-2 border-background-600 hover:border-background-500"
                  }`}
                >
                  {impact}
                </button>
              ))}
            </div>
          )}
        />
        {errors.impact && (
          <p className="mt-1 text-sm text-red-400">{errors.impact.message}</p>
        )}
      </div>

      {/* Currencies */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Currencies (Optional)
        </label>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {Object.values(Currency).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => field.onChange(toggleCurrency(currency, field.value))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    field.value.includes(currency)
                      ? "bg-secondary-600 text-white border-2 border-secondary-500"
                      : "bg-background-700 text-background-300 border-2 border-background-600 hover:border-background-500"
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Time Display */}
      <div>
        <label htmlFor="timeDisplay" className="block text-sm font-medium text-white mb-2">
          Time Display *
        </label>
        <select
          id="timeDisplay"
          {...register("timeDisplay")}
          className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {Object.values(TimeDisplay).map((display) => (
            <option key={display} value={display}>
              {display}
            </option>
          ))}
        </select>
      </div>

      {/* News Scope */}
      <div>
        <label htmlFor="newsScope" className="block text-sm font-medium text-white mb-2">
          News Scope *
        </label>
        <select
          id="newsScope"
          {...register("newsScope")}
          className="w-full px-4 py-2 bg-background-700 border border-background-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {Object.values(NewsScope).map((scope) => (
            <option key={scope} value={scope}>
              {scope}
            </option>
          ))}
        </select>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-background-600">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 bg-background-700 hover:bg-background-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          {defaultValues ? "Update Schedule" : "Create Schedule"}
        </button>
      </div>
    </form>
  );
}

