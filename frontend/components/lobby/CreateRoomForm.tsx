"use client";

import { useState } from "react";
import "@/styles/cards.css";

type CreateRoomPayload = {
  username: string;
  roomName: string;
  maxPlayers: 2 | 4;
};

type FormErrors = { username?: string };

export function CreateRoomForm() {
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<2 | 4>(4);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!username.trim()) next.username = "Username is required.";
    return next;
  }

  function handleBlur(field: string) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    setTouched({ username: true });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const payload: CreateRoomPayload = {
      username: username.trim(),
      roomName: roomName.trim(),
      maxPlayers,
    };
    console.log("[CreateRoomForm] submit payload:", payload);
  }

  const isValid = !validate().username;

  return (
    <div className="glow-panel p-6">
      <div className="mb-5 flex items-center gap-2">
        <span
          className="text-lg"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 0 6px #e555c7)" }}
        >
          ♠
        </span>
        <h2 className="text-base font-semibold text-slate-50">Create Room</h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="create-username"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Username <span className="text-pink-400">*</span>
          </label>
          <input
            id="create-username"
            type="text"
            placeholder="Enter your username"
            value={username}
            className="glow-input"
            autoComplete="nickname"
            aria-invalid={!!(touched.username && errors.username)}
            aria-describedby={
              touched.username && errors.username
                ? "create-username-error"
                : undefined
            }
            onChange={(e) => {
              setUsername(e.target.value);
              if (touched.username) setErrors(validate());
            }}
            onBlur={() => handleBlur("username")}
          />
          {touched.username && errors.username && (
            <p
              id="create-username-error"
              role="alert"
              className="text-xs text-red-400"
            >
              {errors.username}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="create-room-name"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Room Name{" "}
            <span className="normal-case font-normal text-slate-600">
              (optional)
            </span>
          </label>
          <input
            id="create-room-name"
            type="text"
            placeholder="e.g. Friday Night Game"
            value={roomName}
            className="glow-input"
            autoComplete="off"
            onChange={(e) => setRoomName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="create-max-players"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Max Players{" "}
            <span className="normal-case font-normal text-slate-600">
              (optional)
            </span>
          </label>
          <select
            id="create-max-players"
            value={maxPlayers}
            className="glow-input glow-select"
            onChange={(e) => setMaxPlayers(Number(e.target.value) as 2 | 4)}
          >
            <option value={2}>2 Players</option>
            <option value={4}>4 Players</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="glow-btn glow-btn--primary mt-1"
        >
          Create Room
        </button>
      </form>
    </div>
  );
}