import { RoomHeader } from "@/components/room/RoomHeader";
import { PlayerRoster } from "@/components/room/PlayerRoster";
import { RoomStatus } from "@/components/room/RoomStatus";
import { RoomActions } from "@/components/room/RoomActions";
import "@/styles/cards.css";

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;

  return (
    <main className="lobby-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl flex flex-col gap-6">
        <RoomHeader roomId={id} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <RoomStatus />
            <PlayerRoster />
          </div>
          <div>
            <RoomActions />
          </div>
        </div>
      </div>
    </main>
  );
}