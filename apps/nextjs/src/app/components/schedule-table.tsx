"use client";

import type { Schedule } from "@repo/db/types";
import { useState } from "react";

interface ScheduleTableProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
  isDeleting?: string | null;
}

export default function ScheduleTable({
  schedules,
  onEdit,
  onDelete,
  isDeleting,
}: ScheduleTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDeleteClick = (scheduleId: string) => {
    if (deleteConfirm === scheduleId) {
      onDelete(scheduleId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(scheduleId);
      // Auto-cancel after 3 seconds
      setTimeout(() => {
        setDeleteConfirm(null);
      }, 3000);
    }
  };

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 bg-background-700 rounded-xl border border-background-600">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background-600 mb-4">
          <svg
            className="w-8 h-8 text-background-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No schedules yet
        </h3>
        <p className="text-background-400">
          Create your first schedule to start receiving news updates
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-background-600">
            <th className="px-4 py-3 text-left text-xs font-medium text-background-400 uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-background-400 uppercase tracking-wider">
              Timezone
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-background-400 uppercase tracking-wider">
              Frequency
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-background-400 uppercase tracking-wider">
              Market
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-background-400 uppercase tracking-wider">
              Impact
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-background-400 uppercase tracking-wider">
              Currency
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-background-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-background-600">
          {schedules.map((schedule) => (
            <tr
              key={schedule.id}
              className="hover:bg-background-700/50 transition-colors"
            >
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-white font-medium">
                  {String(schedule.hour).padStart(2, "0")}:{String(schedule.minute).padStart(2, "0")}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-full border border-primary-500/30">
                  {schedule.timeZone.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="text-background-300 text-sm">
                  {schedule.frequency}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-accent-500/20 text-accent-400 text-xs rounded-full border border-accent-500/30">
                  {schedule.market}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1">
                  {schedule.impact.map((impact) => (
                    <span
                      key={impact}
                      className="px-2 py-1 bg-secondary-500/20 text-secondary-400 text-xs rounded-full border border-secondary-500/30"
                    >
                      {impact}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-4">
                {schedule.currency.length > 0 ? (
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {schedule.currency.slice(0, 3).map((currency) => (
                      <span
                        key={currency}
                        className="px-2 py-1 bg-background-600 text-background-300 text-xs rounded"
                      >
                        {currency}
                      </span>
                    ))}
                    {schedule.currency.length > 3 && (
                      <span className="px-2 py-1 text-background-400 text-xs">
                        +{schedule.currency.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-background-500 text-sm">All</span>
                )}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(schedule)}
                    className="px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(schedule.id)}
                    disabled={isDeleting === schedule.id}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      deleteConfirm === schedule.id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isDeleting === schedule.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : deleteConfirm === schedule.id ? (
                      "Confirm?"
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

