"use client";

import { useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import { CreateRoomForm } from "@/components/lobby";
import { JoinRoomForm } from "@/components/lobby";
import { LobbyHeader } from "@/components/lobby";
import { RoomList } from "@/components/lobby";
import "@/styles/cards.css";

export default function LobbyPage() {
  const { dispatchers } = useAppState();

  useEffect(() => {
    // Refresh room list on mount to show current available rooms
    dispatchers.room.refreshRoomList();
  }, [dispatchers.room]);

  return (
    <main className="lobby-bg px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <LobbyHeader />
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <CreateRoomForm />
            <JoinRoomForm />
          </div>
          <div>
            <RoomList />
          </div>
        </div>
      </div>
    </main>
  );
}