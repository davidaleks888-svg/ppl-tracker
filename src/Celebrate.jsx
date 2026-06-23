// ============================================================
// Celebrate.jsx — workout completion celebration
// A tasteful, premium moment: a strong athletic silhouette,
// champagne confetti, and the session's headline numbers.
// ============================================================
import React, { useEffect } from "react";
import { C, FONT } from "./theme.js";

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.12,
  color: [C.gold, C.sage, C.rose, C.ink][i % 4],
  size: 6 + (i % 3) * 3,
}));

// A clean athletic figure (abstract, celebratory pose) drawn as SVG.
function AthleteMark() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" stroke={C.gold} strokeWidth="1.5" opacity="0.5" />
      <circle cx="60" cy="60" r="44" stroke={C.gold} strokeWidth="0.75" opacity="0.3" />
      {/* victorious figure: arms raised */}
      <g stroke={C.gold} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <circle cx="60" cy="40" r="7" fill={C.gold} stroke="none" />
        <path d="M60 48 L60 74" />
        <path d="M60 54 L44 40" />
        <path d="M60 54 L76 40" />
        <path d="M60 74 L50 92" />
        <path d="M60 74 L70 92" />
      </g>
    </svg>
  );
}

export default function Celebrate({ data, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100, background: "rgba(6,6,8,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backdropFilter: "blur(3px)",
    }}>
      {/* confetti */}
      {CONFETTI.map((c, i) => (
        <span key={i} style={{
          position: "absolute", top: "32%", left: `${c.left}%`, width: c.size, height: c.size * 1.6,
          background: c.color, borderRadius: 2, opacity: 0,
          animation: `ppl-confetti 1.6s ${c.delay}s ease-in forwards`,
        }} />
      ))}

      <div onClick={(e) => e.stopPropagation()} style={{
        textAlign: "center", animation: "ppl-pop .5s ease both", maxWidth: 360, width: "100%",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><AthleteMark /></div>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: C.gold, fontWeight: 600 }}>
          {data.kind === "cardio" ? "Cardio complete" : "Session complete"}
        </div>
        <h2 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 600, color: C.ink, margin: "6px 0 18px", letterSpacing: 0.3 }}>
          {data.title}
        </h2>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: data.prs?.length ? 16 : 4 }}>
          {data.stats.map((s) => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 16px", minWidth: 86 }}>
              <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: C.gold }}>{s.value}</div>
              <div style={{ color: C.dim, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {data.prs?.length > 0 && (
          <div style={{ background: C.sageSoft, border: `1px solid ${C.sage}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ color: C.sage, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>New personal record{data.prs.length > 1 ? "s" : ""}</div>
            {data.prs.map((p) => <div key={p} style={{ color: C.ink, fontSize: 13 }}>{p}</div>)}
          </div>
        )}

        <button onClick={onClose} style={{
          border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 14,
          padding: "13px 28px", background: C.gold, color: C.black, fontFamily: FONT.body,
        }}>Done</button>
      </div>
    </div>
  );
}
