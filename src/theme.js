// ============================================================
// theme.js — original dark tokens
// ============================================================
// The first version's palette: deep slate-black panels with
// green / blue / amber accents, system sans throughout.

export const C = {
  bg: "#0E1116",          // app background
  surface: "#171C24",     // raised panel
  surface2: "#1E2530",    // input wells
  line: "#2A3340",        // hairline
  ink: "#E6EAF0",         // text
  dim: "#8A95A5",         // muted label
  faint: "#6A7484",       // faintest
  gold: "#4ADE80",        // primary accent (green)
  goldSoft: "rgba(74,222,128,0.12)",
  sage: "#38BDF8",        // secondary accent (blue) for progress/positive
  sageSoft: "rgba(56,189,248,0.12)",
  rose: "#FBBF24",        // warnings / highlights (amber)
  black: "#0A0E13",
};

export const FONT = {
  display: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

// Base resets + keyframes (no web fonts in the original theme).
export function installFonts() {
  if (document.getElementById("ppl-fonts")) return;
  const style = document.createElement("style");
  style.id = "ppl-fonts";
  style.textContent = `
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    input, select, button, textarea { font-family: ${FONT.body}; }
    input:focus-visible, select:focus-visible, button:focus-visible {
      outline: 2px solid ${C.gold}; outline-offset: 1px;
    }
    select { background-image: none; }
    ::placeholder { color: ${C.faint}; }
    @keyframes ppl-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes ppl-pop { 0% { transform: scale(.7); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes ppl-confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(140px) rotate(320deg); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  `;
  document.head.appendChild(style);
}
