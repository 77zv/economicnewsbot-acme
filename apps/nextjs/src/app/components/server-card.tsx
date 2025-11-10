"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface ServerCardProps {
  id: string;
  name: string;
  iconUrl: string | null;
  botInstalled: boolean;
  scheduleCount?: number;
}

export default function ServerCard({
  id,
  name,
  iconUrl,
  botInstalled,
  scheduleCount = 0,
}: ServerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="relative"
    >
      <Link
        href={`/dashboard/server/${id}`}
        className="block group"
      >
        <div className="relative overflow-hidden rounded-xl bg-background-800 border border-background-700 hover:border-primary-500 transition-all duration-300 shadow-lg hover:shadow-xl">
          {/* Status Badge */}
          {botInstalled && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-500/20 text-secondary-400 border border-secondary-500/30">
                <span className="w-2 h-2 bg-secondary-400 rounded-full animate-pulse"></span>
                Active
              </span>
            </div>
          )}

          <div className="p-6">
            {/* Server Icon */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-background-700 flex-shrink-0 border-2 border-background-600 group-hover:border-primary-500 transition-colors">
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt={`${name} icon`}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-background-400">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                  {name}
                </h3>
                <p className="text-sm text-background-400 mt-1">
                  {botInstalled ? (
                    <>
                      {scheduleCount} {scheduleCount === 1 ? "schedule" : "schedules"}
                    </>
                  ) : (
                    "Bot not configured"
                  )}
                </p>
              </div>
            </div>

            {/* Action Area */}
            <div className="flex items-center justify-between pt-4 border-t border-background-700">
              <span className="text-sm text-background-400">
                {botInstalled ? "Manage schedules" : "Set up bot"}
              </span>
              <svg
                className="w-5 h-5 text-background-500 group-hover:text-primary-500 group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

