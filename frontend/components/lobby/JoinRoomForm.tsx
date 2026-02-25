'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/hooks/useAppState';
import '@/styles/cards.css';

type FormErrors = { username?: string; roomCode?: string };

export function JoinRoomForm() {
  const router = useRouter();
  const { dispatchers, room } = useAppState();

  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Navigate to room once roomId is populated by the server response
  useEffect(() => {
    if (room.roomId) {
      router.push(`/room/${room.roomId}`);
    }
  }, [room.roomId, router]);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!username.trim()) next.username = 'Username is required.';
    if (!roomCode.trim()) next.roomCode = 'Room code is required.';
    return next;
  }

  function handleBlur(field: string) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    setTouched({ username: true, roomCode: true });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    dispatchers.room.joinRoom(
      roomCode.trim(),
      username.trim() || undefined,
    );
  }

  const isValid = Object.keys(validate()).length === 0;

  return (
    <div className="glow-panel p-6">
      <div className="mb-5 flex items-center gap-2">
        <span
          className="text-lg"
          aria-hidden="true"
          style={{ filter: 'drop-shadow(0 0 6px #55aaff)' }}
        >
          ♦
        </span>
        <h2 className="text-base font-semibold text-slate-50">Join Room</h2>
      </div>

      {room.error && (
        <div
          role="alert"
          className="mb-4 rounded-lg px-3 py-2 text-xs text-red-400"
          style={{
            background: 'rgba(255,85,119,0.08)',
            border: '1px solid rgba(255,85,119,0.25)',
          }}
        >
          {room.error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="join-username"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Username <span className="text-pink-400">*</span>
          </label>
          <input
            id="join-username"
            type="text"
            placeholder="Enter your username"
            value={username}
            className="glow-input"
            autoComplete="nickname"
            aria-invalid={!!(touched.username && errors.username)}
            aria-describedby={
              touched.username && errors.username
                ? 'join-username-error'
                : undefined
            }
            onChange={(e) => {
              setUsername(e.target.value);
              if (touched.username) setErrors(validate());
            }}
            onBlur={() => handleBlur('username')}
          />
          {touched.username && errors.username && (
            <p
              id="join-username-error"
              role="alert"
              className="text-xs text-red-400"
            >
              {errors.username}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="join-room-code"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Room Code <span className="text-pink-400">*</span>
          </label>
          <input
            id="join-room-code"
            type="text"
            placeholder="e.g. ABCD"
            value={roomCode}
            maxLength={8}
            className="glow-input font-mono tracking-widest"
            autoComplete="off"
            aria-invalid={!!(touched.roomCode && errors.roomCode)}
            aria-describedby={
              touched.roomCode && errors.roomCode
                ? 'join-room-code-error'
                : undefined
            }
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              if (touched.roomCode) setErrors(validate());
            }}
            onBlur={() => handleBlur('roomCode')}
          />
          {touched.roomCode && errors.roomCode && (
            <p
              id="join-room-code-error"
              role="alert"
              className="text-xs text-red-400"
            >
              {errors.roomCode}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!isValid || room.isLoading}
          className="glow-btn glow-btn--secondary mt-1"
        >
          {room.isLoading ? 'Joining…' : 'Join Room'}
        </button>
      </form>
    </div>
  );
}