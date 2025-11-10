"use client";

import { useParams, useRouter } from "next/navigation";
import Nav from "../../app/components/nav";
import Footer from "../../app/components/footer";
import Modal from "../../app/components/modal";
import ScheduleForm from "../../app/components/schedule-form";
import ScheduleTable from "../../app/components/schedule-table";
import { api } from "../api";
import { useSession } from "../../lib/auth-client";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { Schedule } from "@repo/db";

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const { data: session, isPending } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  const utils = api.useUtils();
  const { data: guildDetails, isLoading, error } = api.guild.getGuildDetails.useQuery(
    { guildId },
    { enabled: !!session && !!guildId }
  );

  const createScheduleMutation = api.guild.createSchedule.useMutation({
    onSuccess: () => {
      utils.guild.getGuildDetails.invalidate({ guildId });
      setIsModalOpen(false);
      setEditingSchedule(null);
    },
    onError: (error) => {
      alert(`Error creating schedule: ${error.message}`);
    },
  });

  const updateScheduleMutation = api.guild.updateSchedule.useMutation({
    onSuccess: () => {
      utils.guild.getGuildDetails.invalidate({ guildId });
      setIsModalOpen(false);
      setEditingSchedule(null);
    },
    onError: (error) => {
      alert(`Error updating schedule: ${error.message}`);
    },
  });

  const deleteScheduleMutation = api.guild.deleteSchedule.useMutation({
    onSuccess: () => {
      utils.guild.getGuildDetails.invalidate({ guildId });
    },
    onError: (error) => {
      alert(`Error deleting schedule: ${error.message}`);
    },
  });

  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    deleteScheduleMutation.mutate({ guildId, scheduleId });
  };

  const handleSubmitForm = (data: any) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({
        guildId,
        scheduleId: editingSchedule.id,
        ...data,
      });
    } else {
      createScheduleMutation.mutate({
        guildId,
        ...data,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  if (isPending || !session) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-background-800 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-background-400">Loading...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-background-800 py-12 pt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-background-400">Loading server details...</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !guildDetails) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-background-800 py-12 pt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-red-400 font-semibold">Error loading server</h3>
                  <p className="text-red-300 text-sm mt-1">
                    {error?.message || "Failed to fetch server details"}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-background-700 hover:bg-background-600 text-white rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const { guild, schedules } = guildDetails;

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-background-800 py-12 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-6 flex items-center gap-2 text-background-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </button>

          {/* Server Header */}
          <div className="mb-8 p-6 bg-background-700 rounded-xl border border-background-600">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-background-600 flex-shrink-0">
                {guild.iconUrl ? (
                  <Image
                    src={guild.iconUrl}
                    alt={`${guild.name} icon`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-background-400">
                    {guild.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  {guild.name}
                </h1>
                <p className="text-background-400">
                  {schedules.length} {schedules.length === 1 ? "schedule" : "schedules"} configured
                </p>
              </div>
            </div>
          </div>

          {/* Schedules Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Schedules</h2>
              <button 
                onClick={handleCreateSchedule}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Schedule
              </button>
            </div>

            <ScheduleTable
              schedules={schedules}
              onEdit={handleEditSchedule}
              onDelete={handleDeleteSchedule}
              isDeleting={deleteScheduleMutation.isPending ? deleteScheduleMutation.variables?.scheduleId : null}
            />
          </div>

          {/* Schedule Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={editingSchedule ? "Edit Schedule" : "Create New Schedule"}
          >
            <ScheduleForm
              onSubmit={handleSubmitForm}
              onCancel={handleCloseModal}
              defaultValues={editingSchedule || undefined}
              isLoading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
            />
          </Modal>
        </div>
      </div>
      <Footer />
    </>
  );
}

