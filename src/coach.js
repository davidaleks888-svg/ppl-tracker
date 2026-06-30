// ============================================================
// coach.js — rule-based goal coaching + trend alerts
// ============================================================
// Reads the user's own logged trends and produces prioritized,
// data-backed insights. This is heuristic guidance, NOT medical
// advice — anything in clinical territory defers to a doctor.

import { e1rm, bestFor, bodyFatJP3, SKINFOLDS_M, SKINFOLDS_F, mondayOf, sessionVolume } from "./core.js";

// severity: "good" | "info" | "warn" | "alert"
function ins(severity, title, detail) { return { severity, title, detail }; }

// ---- helpers ----
function lastNDays(items, n, dateKey = "date") {
  const cutoff = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  return items.filter((x) => x[dateKey] >= cutoff);
}
function linregSlope(points) {
  // points: [{x, y}] — returns slope in y-units per x-unit
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((a, p) => a + p.x, 0);
  const sy = points.reduce((a, p) => a + p.y, 0);
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0);
  const d = n * sxx - sx * sx;
  if (d === 0) return null;
  return (n * sxy - sx * sy) / d;
}
function weeklyVolumeSeries(workouts) {
  const byWeek = {};
  workouts.forEach((w) => {
    const wk = mondayOf(w.date);
    byWeek[wk] = (byWeek[wk] || 0) + sessionVolume(w);
  });
  return Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0])).map(([wk, v]) => ({ wk, v }));
}
function bodyWeightSeries(body) {
  return body.filter((b) => b.weight).map((b) => ({ date: b.date, v: +b.weight }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
function latestBF(body, settings) {
  const sites = settings.sex === "female" ? SKINFOLDS_F : SKINFOLDS_M;
  const withBF = body.map((b) => {
    const sum = sites.reduce((a, s) => a + (parseFloat(b.skinfolds?.[s]) || 0), 0);
    const bf = bodyFatJP3(sum, +settings.age, settings.sex);
    return bf != null ? { date: b.date, bf } : null;
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  return withBF;
}

// ---- universal trend signals (apply to all goals) ----
function sleepSignals(body, settings) {
  const out = [];
  const recent = lastNDays(body, 7).filter((b) => b.sleep);
  if (recent.length >= 3) {
    const avg = recent.reduce((a, b) => a + +b.sleep, 0) / recent.length;
    const below = recent.filter((b) => +b.sleep < settings.sleepTarget - 0.5).length;
    if (below >= 4) {
      out.push(ins("warn", "Sleep is short",
        `${below} of the last ${recent.length} nights were under ${settings.sleepTarget}h (avg ${avg.toFixed(1)}h). Recovery, hormones, and muscle growth all suffer — this is the highest-leverage fix right now.`));
    } else if (avg >= settings.sleepTarget) {
      out.push(ins("good", "Sleep on point", `Averaging ${avg.toFixed(1)}h over the last ${recent.length} nights — at or above your ${settings.sleepTarget}h target.`));
    }
  }
  return out;
}

function plateauSignals(workouts) {
  const out = [];
  // detect plateau on the user's most-logged big lift
  const counts = {};
  workouts.forEach((w) => w.lifts.forEach((l) => {
    if (l.sets.some((s) => parseFloat(s.w) && parseInt(s.r))) counts[l.name] = (counts[l.name] || 0) + 1;
  }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 4) return out;
  const name = top[0];
  // build e1RM series
  const series = [];
  [...workouts].sort((a, b) => a.date.localeCompare(b.date)).forEach((w, i) => {
    let best = null;
    w.lifts.filter((l) => l.name === name).forEach((l) => l.sets.forEach((s) => {
      const wt = parseFloat(s.w), r = parseInt(s.r);
      if (wt && r) { const e = e1rm(wt, r); if (!best || e > best) best = e; }
    }));
    if (best) series.push({ x: series.length, y: best });
  });
  if (series.length < 4) return out;
  const recent = series.slice(-4);
  const slope = linregSlope(recent);
  const first = recent[0].y, last = recent[recent.length - 1].y;
  const pctChange = ((last - first) / first) * 100;
  if (slope != null && pctChange < 1 && pctChange > -3) {
    out.push(ins("warn", `Plateau on ${name}`,
      `Estimated 1RM has moved ${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}% over your last 4 sessions (${first.toFixed(0)}→${last.toFixed(0)}). Time to change a variable: add a set, push closer to failure, deload a week, or swap the variation.`));
  } else if (pctChange >= 1) {
    out.push(ins("good", `${name} climbing`, `Estimated 1RM up ${pctChange.toFixed(1)}% across your last 4 sessions (${first.toFixed(0)}→${last.toFixed(0)}). Progressive overload is working — keep the pressure on.`));
  } else if (pctChange <= -3) {
    out.push(ins("warn", `${name} slipping`, `Estimated 1RM down ${Math.abs(pctChange).toFixed(1)}% over 4 sessions. Could be fatigue or under-recovery — check sleep and whether a deload is due.`));
  }
  return out;
}

function consistencySignals(workouts) {
  const out = [];
  const last14 = lastNDays(workouts, 14);
  const perWeek = last14.length / 2;
  if (workouts.length >= 3 && perWeek < 2) {
    out.push(ins("info", "Training frequency low", `~${perWeek.toFixed(1)} sessions/week over the last 2 weeks. For muscle, 3+ weekly sessions hitting each muscle ~2x is the sweet spot.`));
  }
  return out;
}

// High perceived effort across recent sessions can signal accumulating fatigue.
function rpeSignals(workouts) {
  const out = [];
  const recent = lastNDays(workouts, 10);
  const rpes = [];
  recent.forEach((w) => w.lifts.forEach((l) => {
    if (l.rpe === "max" || l.rpe === "9") rpes.push(2);
    else if (l.rpe === "8") rpes.push(1);
    else if (l.rpe) rpes.push(0);
  }));
  if (rpes.length >= 6) {
    const hard = rpes.filter((x) => x === 2).length;
    const frac = hard / rpes.length;
    if (frac >= 0.5) {
      out.push(ins("warn", "Effort running very high",
        `${Math.round(frac * 100)}% of your recent logged lifts were at RPE 9–max. Sustained max effort accelerates fatigue — make sure a deload is scheduled and sleep is solid, or progress will stall.`));
    }
  }
  // surface a recent note that flags a niggle/pain so it isn't lost
  const flagged = [];
  recent.forEach((w) => w.lifts.forEach((l) => {
    if (l.note && /pain|hurt|tweak|twinge|sore|niggle|injur/i.test(l.note)) flagged.push(`${l.name}: "${l.note}"`);
  }));
  if (flagged.length) {
    out.push(ins("info", "You noted some discomfort", `Recent session notes mention possible niggles — ${flagged.slice(0, 2).join("; ")}. Worth watching; back off if it worsens.`));
  }
  return out;
}

// ---- medical-adjacent (longevity) signals — conservative, defer to doctor ----
function vitalsSignals(body) {
  const out = [];
  const withBP = body.filter((b) => b.vitals?.bpSys && b.vitals?.bpDia)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (withBP.length) {
    const recent = withBP.slice(-3);
    const avgSys = Math.round(recent.reduce((a, b) => a + +b.vitals.bpSys, 0) / recent.length);
    const avgDia = Math.round(recent.reduce((a, b) => a + +b.vitals.bpDia, 0) / recent.length);
    // ACC/AHA general reference ranges — informational only
    if (avgSys >= 130 || avgDia >= 80) {
      out.push(ins("alert", "Blood pressure worth a look",
        `Recent average ${avgSys}/${avgDia} mmHg sits above the general 120/80 reference. This is informational, not a diagnosis — bring it to a doctor, especially if it persists.`));
    } else if (avgSys > 0) {
      out.push(ins("good", "Blood pressure in range", `Recent average ${avgSys}/${avgDia} mmHg, within the general healthy reference. Keep tracking it.`));
    }
  }
  const withRHR = body.filter((b) => b.vitals?.restingHR).sort((a, b) => a.date.localeCompare(b.date));
  if (withRHR.length >= 4) {
    const pts = withRHR.slice(-6).map((b, i) => ({ x: i, y: +b.vitals.restingHR }));
    const slope = linregSlope(pts);
    if (slope != null && slope > 1) {
      out.push(ins("info", "Resting HR trending up", `Resting heart rate has been climbing recently. Can reflect accumulated fatigue, stress, or under-recovery — worth easing off if it continues.`));
    }
  }
  return out;
}

// ---- goal-specific analysis ----
function muscleGoal(ctx) {
  const { workouts, body, settings } = ctx;
  const out = [];
  const bw = bodyWeightSeries(body);
  if (bw.length >= 4) {
    const recent = bw.slice(-4).map((p, i) => ({ x: i, y: p.v }));
    const slope = linregSlope(recent); // kg per measurement-step
    const span = bw.slice(-4);
    const days = (new Date(span[span.length - 1].date) - new Date(span[0].date)) / 864e5 || 1;
    const ratePerWeek = slope != null ? (slope * (span.length - 1)) / (days / 7) : null;
    const cur = bw[bw.length - 1].v;
    if (ratePerWeek != null) {
      const pctWk = (ratePerWeek / cur) * 100;
      if (pctWk > 0.5) {
        out.push(ins("warn", "Gaining a bit fast", `Bodyweight up ~${ratePerWeek.toFixed(2)}/wk (${pctWk.toFixed(1)}%/wk). For lean muscle, ~0.25–0.5%/wk limits fat gain — consider trimming the surplus slightly.`));
      } else if (pctWk >= 0.1) {
        out.push(ins("good", "Lean gaining pace", `Bodyweight up ~${ratePerWeek.toFixed(2)}/wk (${pctWk.toFixed(1)}%/wk) — right in the lean-bulk range for muscle with minimal fat.`));
      } else if (pctWk <= -0.1) {
        out.push(ins("info", "Weight flat/dropping", `For muscle gain you generally need a small surplus. Bodyweight is ${pctWk <= 0 ? "drifting down" : "flat"} — nudge calories up ~150–250/day if scale and lifts aren't moving.`));
      }
    }
  }
  // volume progression
  const vol = weeklyVolumeSeries(workouts);
  if (vol.length >= 3) {
    const pts = vol.slice(-4).map((p, i) => ({ x: i, y: p.v }));
    const slope = linregSlope(pts);
    if (slope != null && slope <= 0) {
      out.push(ins("info", "Weekly volume not rising", "Total weekly tonnage is flat or down. Muscle growth tracks with progressive volume — add a set to a lagging lift or a touch more load."));
    }
  }
  return out;
}

function cutGoal(ctx) {
  const { workouts, body } = ctx;
  const out = [];
  const bw = bodyWeightSeries(body);
  if (bw.length >= 4) {
    const span = bw.slice(-4);
    const days = (new Date(span[span.length - 1].date) - new Date(span[0].date)) / 864e5 || 1;
    const change = span[span.length - 1].v - span[0].v;
    const ratePerWeek = (change) / (days / 7);
    const cur = bw[bw.length - 1].v;
    const pctWk = (ratePerWeek / cur) * 100;
    if (pctWk < -1.2) {
      out.push(ins("warn", "Cutting too aggressively", `Losing ~${Math.abs(ratePerWeek).toFixed(2)}/wk (${Math.abs(pctWk).toFixed(1)}%/wk). Above ~1%/wk raises muscle-loss risk — ease the deficit and keep protein high.`));
    } else if (pctWk <= -0.4) {
      out.push(ins("good", "Cutting at a good pace", `Down ~${Math.abs(ratePerWeek).toFixed(2)}/wk (${Math.abs(pctWk).toFixed(1)}%/wk) — sustainable range that protects muscle.`));
    } else if (pctWk > -0.1) {
      out.push(ins("info", "Fat loss stalled", `Bodyweight is flat over your last 4 weigh-ins. If you're cutting, tighten calories ~150–200/day or add cardio/steps.`));
    }
  }
  // strength retention while cutting = good sign
  out.push(ins("info", "Protect muscle while cutting", "Keep training heavy and protein at ~2.0–2.4 g/kg. If your key lifts' e1RM holds or rises during the cut, you're losing fat, not muscle."));
  return out;
}

function longevityGoal(ctx) {
  const { body, cardio, settings } = ctx;
  const out = [];
  out.push(...vitalsSignals(body));
  // cardio volume
  const wk = lastNDays(cardio, 7).reduce((a, c) => a + (+c.minutes || 0), 0);
  if (wk < settings.cardioTarget) {
    out.push(ins("info", "Cardio below target", `${wk} min this week vs ${settings.cardioTarget} target. Zone 2 work and weekly VO₂-max efforts are among the strongest longevity levers.`));
  } else {
    out.push(ins("good", "Cardio target met", `${wk} min this week — at or above your ${settings.cardioTarget} min goal.`));
  }
  const spo2 = body.filter((b) => b.vitals?.spo2).slice(-1)[0];
  if (spo2 && +spo2.vitals.spo2 < 94) {
    out.push(ins("alert", "Low blood-oxygen reading", `Last SpO₂ was ${spo2.vitals.spo2}%. A single reading can be a sensor artifact, but persistently under ~94% is worth a doctor's attention.`));
  }
  return out;
}

// ---- main entry ----
export function coachInsights(ctx) {
  const { settings } = ctx;
  let out = [];
  // goal-specific first (highest priority)
  if (settings.goal === "muscle") out.push(...muscleGoal(ctx));
  else if (settings.goal === "cut") out.push(...cutGoal(ctx));
  else if (settings.goal === "longevity") out.push(...longevityGoal(ctx));

  // universal signals
  out.push(...plateauSignals(ctx.workouts));
  out.push(...sleepSignals(ctx.body, settings));
  out.push(...rpeSignals(ctx.workouts));
  out.push(...consistencySignals(ctx.workouts));
  // always surface BP alerts regardless of goal (safety)
  if (settings.goal !== "longevity") {
    out.push(...vitalsSignals(ctx.body).filter((i) => i.severity === "alert"));
  }

  // order: alert > warn > good > info, capped
  const rank = { alert: 0, warn: 1, good: 2, info: 3 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return out.slice(0, 6);
}

// Pure "celebration / warning" alerts for Home banner — the sharp ones only.
export function priorityAlerts(ctx) {
  return coachInsights(ctx).filter((i) => i.severity === "alert" || i.severity === "warn").slice(0, 3);
}
