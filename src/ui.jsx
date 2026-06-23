// ============================================================
// ui.jsx — shared presentational primitives
// ============================================================
import React from "react";
import { C, FONT } from "./theme.js";

export function Eyebrow({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: C.gold, fontWeight: 700 }}>{children}</div>;
}

export function Card({ title, action, children, style }) {
  return (
    <section style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 12, animation: "ppl-rise .4s ease both", ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
          {title && <h3 style={{ margin: 0, fontFamily: FONT.display, fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, accent = C.gold }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ color: C.dim, fontSize: 12 }}>{label}</div>
      <div style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1.05, margin: "3px 0 2px" }}>{value}</div>
      {sub && <div style={{ color: C.faint, fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

export function Btn({ children, onClick, variant = "solid", style, type }) {
  const base = {
    border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 14,
    padding: "13px 16px", width: "100%", fontFamily: FONT.body, transition: "filter .15s",
  };
  const variants = {
    solid: { background: C.gold, color: C.black },
    sage: { background: C.sage, color: C.black },
    ghost: { background: "transparent", color: C.gold, border: `1px solid ${C.gold}` },
    quiet: { background: C.surface2, color: C.ink, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: C.rose, border: `1px solid ${C.line}` },
  };
  return <button type={type} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

export function Field({ label, value, onChange, placeholder, suffix, type = "text", inputMode }) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ color: C.ink, fontSize: 14 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type={type} inputMode={inputMode} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "9px 11px", fontSize: 14, width: 96, textAlign: "right" }}
        />
        {suffix && <span style={{ color: C.faint, fontSize: 12, width: 20 }}>{suffix}</span>}
      </span>
    </label>
  );
}

export function Select({ value, onChange, children, style }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 12, padding: "12px 13px", fontSize: 15, fontWeight: 500, appearance: "none", fontFamily: FONT.body, ...style }}>
      {children}
    </select>
  );
}

export function Empty({ children }) {
  return <div style={{ color: C.dim, fontSize: 13, textAlign: "center", padding: "28px 14px", lineHeight: 1.6 }}>{children}</div>;
}

export function Pill({ active, onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 14px", borderRadius: 11, cursor: "pointer", fontWeight: 600, fontSize: 13,
      border: `1px solid ${active ? C.gold : C.line}`, whiteSpace: "nowrap",
      background: active ? C.goldSoft : "transparent", color: active ? C.gold : C.dim,
      fontFamily: FONT.body, ...style,
    }}>{children}</button>
  );
}

export const chartTip = { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, color: C.ink, fontSize: 12 };
