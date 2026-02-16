"use client";

import { useState } from "react";
import "@/styles/cards.css";

type ReadyState = "idle" | "ready";

export function RoomActions() {
  const [readyState, setReadyState] = useState<ReadyState>("idle");

  const isReady = readyState === "ready";

  function handleToggleReady() {
    setReadyState((prev) => (prev === "idle" ? "ready" : "idle"));
    console.log("[RoomActions] toggle ready:", readyState === "idle" ? "ready" : "idle");
  }

  function handleLeave() {
    console.log("[RoomActions] leave room");
  }

  return (
    <section aria-labelledby="actions-heading" className="glow-panel p-5 relative">
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(85,170,255,0.4), transparent)",
        }}
        aria-hidden="true"
      />

      <h2
        id="actions-heading"
        className="text-sm font-semibold text-slate-50 mb-5 flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          style={{ color: "#55aaff", filter: "drop-shadow(0 0 5px #55aaff)" }}
        >
          ♥
        </span>
        Actions
      </h2>

      <div className="flex flex-col gap-3">
        {/* Ready toggle */}
        <button
          type="button"
          onClick={handleToggleReady}
          className="glow-btn"
          style={
            isReady
              ? {
                  background: "linear-gradient(135deg, #0d7a4a 0%, #065c37 100%)",
                  border: "1px solid rgba(85,255,170,0.4)",
                  color: "#55ffaa",
                  boxShadow: "0 0 14px rgba(85,255,170,0.3)",
                  width: "100%",
                }
              : {
                  background: "linear-gradient(135deg, #c040aa 0%, #8833cc 100%)",
                  border: "1px solid rgba(229,85,199,0.45)",
                  color: "#fff",
                  boxShadow: "0 0 14px rgba(229,85,199,0.35)",
                  width: "100%",
                }
          }
          aria-pressed={isReady}
        >
          {isReady ? "✓ Ready" : "Mark as Ready"}
        </button>

        <div className="glow-divider" style={{ margin: "0.25rem 0" }} />

        {/* Leave room */}
        <button
          type="button"
          onClick={handleLeave}
          className="glow-btn"
          style={{
            background: "rgba(255,85,119,0.07)",
            border: "1px solid rgba(255,85,119,0.22)",
            color: "#ff5577",
            width: "100%",
          }}
        >
          Leave Room
        </button>
      </div>

      {/* Waiting hint */}
      {!isReady && (
        <p className="mt-4 text-center text-xs text-slate-600">
          Mark yourself ready when you're set to play.
        </p>
      )}
    </section>
  );
}