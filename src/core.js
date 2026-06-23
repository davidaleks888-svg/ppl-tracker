// ============================================================
// core.js — data model, storage, and fitness calculations
// ============================================================

// ---- Default program ----
export const DEFAULT_PROGRAM = {
  Push: [
    { slot: "Horizontal press", sets: 3, reps: "6–8", options: ["Barbell bench press", "Dumbbell bench press", "Machine chest press", "Push-ups (weighted)"] },
    { slot: "Vertical press", sets: 3, reps: "8–10", options: ["Standing overhead press", "Seated DB shoulder press", "Machine shoulder press", "Arnold press"] },
    { slot: "Upper-chest", sets: 2, reps: "10–12", options: ["Incline DB press", "Incline barbell press", "Low-to-high cable flye", "Incline machine press"] },
    { slot: "Side delts", sets: 2, reps: "12–15", options: ["Dumbbell lateral raise", "Cable lateral raise", "Machine lateral raise"] },
    { slot: "Triceps", sets: 2, reps: "10–12", options: ["Triceps pushdown", "Dips", "Overhead cable extension", "Skull crushers"] },
  ],
  Pull: [
    { slot: "Vertical pull", sets: 3, reps: "6–10", options: ["Pull-ups", "Lat pulldown", "Assisted pull-ups", "Neutral-grip pulldown"] },
    { slot: "Horizontal pull", sets: 3, reps: "8–10", options: ["Barbell row", "Dumbbell row", "Seated cable row", "Chest-supported row"] },
    { slot: "Rear delts", sets: 2, reps: "12–15", options: ["Face pulls", "Rear-delt flye", "Reverse pec deck"] },
    { slot: "Biceps", sets: 2, reps: "10–12", options: ["Barbell curl", "Dumbbell curl", "Cable curl", "Preacher curl"] },
    { slot: "Brachialis", sets: 2, reps: "10–12", options: ["Hammer curls", "Reverse curls", "Rope hammer curls"] },
  ],
  Legs: [
    { slot: "Squat pattern", sets: 3, reps: "6–8", options: ["Back squat", "Front squat", "Leg press", "Hack squat", "Goblet squat"] },
    { slot: "Hip hinge", sets: 3, reps: "8–10", options: ["Romanian deadlift", "Conventional deadlift", "Hip thrust", "Good mornings"] },
    { slot: "Single-leg", sets: 2, reps: "10/leg", options: ["Walking lunges", "Bulgarian split squats", "Step-ups", "Reverse lunges"] },
    { slot: "Hamstrings", sets: 2, reps: "10–12", options: ["Lying leg curl", "Seated leg curl", "Nordic curls"] },
    { slot: "Calves", sets: 3, reps: "12–15", options: ["Standing calf raise", "Seated calf raise", "Leg-press calf raise"] },
  ],
};

export const DAY_ORDER = ["Push", "Pull", "Legs"];

// Circumference measurement sites
export const GIRTHS = ["Chest", "Waist", "Hips", "L Bicep", "R Bicep", "L Thigh", "R Thigh", "L Calf", "R Calf", "Shoulders"];

// Jackson-Pollock 3-site skinfold sites (male: chest, abdomen, thigh)
export const SKINFOLDS_M = ["Chest", "Abdomen", "Thigh"];
export const SKINFOLDS_F = ["Triceps", "Suprailiac", "Thigh"];

export const DEFAULT_SETTINGS = {
  unit: "kg",
  rest: 90,
  proteinTarget: 140,
  sleepTarget: 8,
  cardioTarget: 150,
  lastDeload: null,
  sex: "male",
  age: 30,
  heightCm: 178,
  calorieTarget: 2400,
};

// ---- Storage (localStorage) ----
const NS = "ppl-tracker:";
export function loadKey(key, fallback) {
  try {
    const r = localStorage.getItem(NS + key);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
}
export function saveKey(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.error("save failed", e);
  }
}

// ---- Date utils ----
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const nowMs = () => Date.now();
export const nowClock = () => { const d = new Date(); return d.toTimeString().slice(0, 5); }; // "HH:MM" local
export const fmtClock = (ms) => ms ? new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
// minutes:seconds from a millisecond duration
export function fmtDur(ms) {
  if (!ms || ms < 0) return "—";
  const tot = Math.round(ms / 1000);
  const h = Math.floor(tot / 3600), m = Math.floor((tot % 3600) / 60), s = tot % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}
// hour bucket label, e.g. 14 -> "2–3pm"
export function hourLabel(h) {
  const f = (x) => { const ap = x < 12 || x === 24 ? "am" : "pm"; let hh = x % 12; if (hh === 0) hh = 12; return `${hh}${ap}`; };
  return `${f(h)}`;
}
// part of day from hour
export function dayPart(h) {
  if (h < 5) return "Night";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
}
export const fmtDate = (s) => new Date(s + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtFull = (s) => new Date(s + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
export function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// ---- Fitness math ----
export const e1rm = (w, r) => (r > 0 ? Math.round(w * (1 + r / 30) * 10) / 10 : w); // Epley
export const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);

// BMI from kg + cm
export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}
export function bmiClass(b) {
  if (b == null) return "";
  if (b < 18.5) return "Underweight";
  if (b < 25) return "Normal";
  if (b < 30) return "Overweight";
  return "Obese";
}

// Jackson-Pollock 3-site body density → Siri body fat %.
// sum = sum of 3 skinfolds (mm), age in years.
export function bodyFatJP3(sum, age, sex) {
  if (!sum || !age) return null;
  let density;
  if (sex === "female") {
    density = 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
  } else {
    density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age;
  }
  const bf = (495 / density) - 450;
  return Math.round(bf * 10) / 10;
}

// Mifflin-St Jeor BMR
export function bmr(weightKg, heightCm, age, sex) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (sex === "female" ? -161 : 5));
}

// Lean body mass from weight + bf%
export function leanMass(weightKg, bf) {
  if (!weightKg || bf == null) return null;
  return Math.round(weightKg * (1 - bf / 100) * 10) / 10;
}

// Best set (by e1RM) for an exercise across workouts
export function bestFor(workouts, exName) {
  let best = null;
  for (const w of workouts) {
    for (const l of w.lifts) {
      if (l.name !== exName) continue;
      for (const s of l.sets) {
        const wt = parseFloat(s.w), r = parseInt(s.r);
        if (!wt || !r) continue;
        const score = e1rm(wt, r);
        if (!best || score > best.e1rm) best = { e1rm: score, w: wt, r, date: w.date };
      }
    }
  }
  return best;
}

// Which day comes next given history
export function nextDay(workouts) {
  const strength = workouts.filter((w) => DAY_ORDER.includes(w.day))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!strength.length) return "Push";
  const last = strength[0].day;
  const idx = DAY_ORDER.indexOf(last);
  return DAY_ORDER[(idx + 1) % DAY_ORDER.length];
}

export function lb2kg(lb) { return lb / 2.2046226; }
export function kg2lb(kg) { return kg * 2.2046226; }

// Workout volume (sum weight×reps) for one session
export function sessionVolume(w) {
  let v = 0;
  w.lifts.forEach((l) => l.sets.forEach((s) => {
    const wt = parseFloat(s.w), r = parseInt(s.r);
    if (wt && r) v += wt * r;
  }));
  return Math.round(v);
}

// Group sessions by hour-of-day bucket and compute average volume + PR rate.
// Only sessions with a recorded startMs are included.
export function timeOfDayStats(workouts) {
  const buckets = {}; // hour -> {count, vol, prs}
  workouts.forEach((w) => {
    if (!w.startMs) return;
    const h = new Date(w.startMs).getHours();
    if (!buckets[h]) buckets[h] = { count: 0, vol: 0, prs: 0 };
    buckets[h].count++;
    buckets[h].vol += sessionVolume(w);
    buckets[h].prs += (w.prCount || 0);
  });
  return Object.entries(buckets).map(([h, b]) => ({
    hour: +h,
    count: b.count,
    avgVol: Math.round(b.vol / b.count),
    prRate: Math.round((b.prs / b.count) * 100) / 100,
  })).sort((a, b) => a.hour - b.hour);
}
