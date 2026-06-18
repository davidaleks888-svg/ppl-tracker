import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";

// ---- Program data ----
// Each slot has a target rep range and a list of interchangeable variations.
const PROGRAM = {
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

const MEASUREMENTS = ["Chest", "Waist", "Hips", "L Arm", "R Arm", "L Thigh", "R Thigh", "Shoulders"];

const DEFAULT_SETTINGS = {
  unit: "kg",            // display label only; existing numbers are not converted
  rest: 90,              // rest timer seconds
  proteinTarget: 140,    // g/day
  sleepTarget: 8,        // hours
  cardioTarget: 150,     // min/week
  lastDeload: null,      // date string; set on first load
};

// ---- Storage helpers (localStorage) ----
const NS = "ppl-tracker:";
function loadKey(key, fallback) {
  try {
    const r = localStorage.getItem(NS + key);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
}
function saveKey(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.error("save failed", e);
  }
}

// ---- Utils ----
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s) => new Date(s + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
const e1rm = (w, r) => (r > 0 ? Math.round(w * (1 + r / 30) * 10) / 10 : w); // Epley
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);
function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00");
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// Best set (by e1RM) for an exercise across a list of workouts
function bestFor(workouts, exName) {
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

// ---- Theme ----
const C = {
  bg: "#0E1116", panel: "#171C24", panel2: "#1E2530", line: "#2A3340",
  text: "#E6EAF0", dim: "#8A95A5", accent: "#4ADE80", accent2: "#38BDF8", warn: "#FBBF24",
};

export default function App() {
  const [tab, setTab] = useState("home");
  const [loaded, setLoaded] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [body, setBody] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setWorkouts(loadKey("workouts", []));
    setBody(loadKey("body", []));
    const s = { ...DEFAULT_SETTINGS, ...loadKey("settings", {}) };
    if (!s.lastDeload) s.lastDeload = todayStr();
    setSettings(s);
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveKey("workouts", workouts); }, [workouts, loaded]);
  useEffect(() => { if (loaded) saveKey("body", body); }, [body, loaded]);
  useEffect(() => { if (loaded) saveKey("settings", settings); }, [settings, loaded]);

  if (!loaded) {
    return <div style={{ ...wrap, alignItems: "center", justifyContent: "center", color: C.dim }}>Loading…</div>;
  }

  return (
    <div style={wrap}>
      <header style={{ padding: "18px 18px 4px" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>PPL · STRENGTH + HEALTH</div>
        <h1 style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 800 }}>Your Tracker</h1>
      </header>

      <nav style={nav}>
        {[["home", "Home"], ["train", "Train"], ["body", "Body"], ["progress", "Progress"], ["more", "More"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tabBtn(tab === id)}>{label}</button>
        ))}
      </nav>

      <main style={{ flex: 1, overflowY: "auto", padding: "14px 16px 90px" }}>
        {tab === "home" && <Home workouts={workouts} body={body} settings={settings} setSettings={setSettings} />}
        {tab === "train" && <Train workouts={workouts} setWorkouts={setWorkouts} settings={settings} />}
        {tab === "body" && <Body body={body} setBody={setBody} settings={settings} />}
        {tab === "progress" && <Progress workouts={workouts} body={body} settings={settings} />}
        {tab === "more" && (
          <More workouts={workouts} setWorkouts={setWorkouts} body={body} setBody={setBody}
                settings={settings} setSettings={setSettings} />
        )}
      </main>
    </div>
  );
}

// ============================== HOME ==============================
function Home({ workouts, body, settings, setSettings }) {
  const unit = settings.unit;

  const weightData = useMemo(
    () => body.filter((b) => b.weight).map((b) => ({ date: fmtDate(b.date), v: +b.weight })),
    [body]
  );

  const last7 = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    return {
      sessions: workouts.filter((w) => w.date >= cutoff).length,
      cardio: body.filter((b) => b.date >= cutoff).reduce((a, b) => a + (+b.cardio || 0), 0),
      avgProtein: avg(body.filter((b) => b.date >= cutoff && b.protein).map((b) => +b.protein)),
      avgSleep: avg(body.filter((b) => b.date >= cutoff && b.sleep).map((b) => +b.sleep)),
    };
  }, [workouts, body]);

  // Weekly tonnage (sum of weight×reps), last 8 weeks
  const volumeData = useMemo(() => {
    const byWeek = {};
    workouts.forEach((w) => {
      const wk = mondayOf(w.date);
      let t = 0;
      w.lifts.forEach((l) => l.sets.forEach((s) => {
        const wt = parseFloat(s.w), r = parseInt(s.r);
        if (wt && r) t += wt * r;
      }));
      byWeek[wk] = (byWeek[wk] || 0) + t;
    });
    return Object.entries(byWeek)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([wk, t]) => ({ date: fmtDate(wk), v: Math.round(t) }));
  }, [workouts]);

  // Deload: weeks since last deload
  const weeksSinceDeload = useMemo(() => {
    if (!settings.lastDeload) return 0;
    return Math.floor((Date.now() - new Date(settings.lastDeload + "T00:00").getTime()) / (7 * 864e5));
  }, [settings.lastDeload]);

  return (
    <div>
      {weeksSinceDeload >= 6 && (
        <div style={deloadBanner}>
          <div>
            <strong>Deload time.</strong>
            <div style={{ fontSize: 12, color: "#3F2D04", marginTop: 2 }}>
              {weeksSinceDeload} weeks of training — take an easy week (half volume), then resume.
            </div>
          </div>
          <button style={deloadBtn} onClick={() => setSettings({ ...settings, lastDeload: todayStr() })}>
            Done
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Stat label="Workouts (7d)" value={last7.sessions} sub="of 3 target" color={C.accent} />
        <Stat label="Cardio (7d)" value={`${last7.cardio}m`} sub={`target ${settings.cardioTarget}m/wk`} color={C.accent2} />
        <Stat label="Avg sleep" value={last7.avgSleep ? `${last7.avgSleep}h` : "—"} sub={`target ${settings.sleepTarget}h`} color={C.warn} />
        <Stat label="Avg protein" value={last7.avgProtein ? `${last7.avgProtein}g` : "—"} sub={`target ${settings.proteinTarget}g`} color={C.accent} />
      </div>

      <Card title={`Bodyweight (${unit})`}>
        {weightData.length > 1 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.dim, fontSize: 11 }} />
              <YAxis tick={{ fill: C.dim, fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tip} />
              <Line type="monotone" dataKey="v" stroke={C.accent} strokeWidth={2.5} dot={false} name={unit} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty>Log weight in the Body tab to see the trend.</Empty>}
      </Card>

      <Card title={`Weekly volume (${unit} lifted)`}>
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={volumeData} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.dim, fontSize: 11 }} />
              <YAxis tick={{ fill: C.dim, fontSize: 11 }} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="v" fill={C.accent2} radius={[4, 4, 0, 0]} name={unit} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty>Log workouts to see your weekly tonnage climb.</Empty>}
        <div style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
          Total weight lifted per week (weight × reps). A slow upward trend = progressive overload working.
        </div>
      </Card>
    </div>
  );
}

// ============================== TRAIN ==============================
function Train({ workouts, setWorkouts, settings }) {
  const [day, setDay] = useState("Push");
  const [date, setDate] = useState(todayStr());
  const [entry, setEntry] = useState(null);
  const [saved, setSaved] = useState(false);
  const [videoFor, setVideoFor] = useState(null);
  const [prMsg, setPrMsg] = useState(null);
  const unit = settings.unit;

  // Rest timer
  const [restEnds, setRestEnds] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!restEnds) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEnds]);
  const restLeft = restEnds ? Math.max(0, Math.ceil((restEnds - now) / 1000)) : 0;
  useEffect(() => {
    if (restEnds && restLeft === 0) {
      // gentle beep when rest is over (if the browser allows it)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.08;
        o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 350);
      } catch { /* silent */ }
      setRestEnds(null);
    }
  }, [restLeft, restEnds]);
  const startRest = () => setRestEnds(Date.now() + settings.rest * 1000);

  // Build a session whenever the day or date changes.
  useEffect(() => {
    const dayWorkouts = workouts
      .filter((w) => w.day === day)
      .sort((a, b) => b.date.localeCompare(a.date));
    const lastSession = dayWorkouts[0];

    const lifts = PROGRAM[day].map((ex) => {
      const prev = lastSession?.lifts.find((l) => l.slot === ex.slot);
      const chosen = prev?.name && ex.options.includes(prev.name) ? prev.name : ex.options[0];
      const sets = Array.from({ length: ex.sets }, (_, i) => ({
        w: prev?.sets[i]?.w ?? "",
        r: "",
      }));
      return { slot: ex.slot, name: chosen, options: ex.options, target: ex.reps, prev, sets };
    });
    setEntry({ date, day, lifts });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, date]);

  if (!entry) return null;

  const update = (li, si, field, val) => {
    setEntry((e) => ({
      ...e,
      lifts: e.lifts.map((l, i) =>
        i !== li ? l : { ...l, sets: l.sets.map((s, j) => (j !== si ? s : { ...s, [field]: val })) }
      ),
    }));
  };

  const pickVariation = (li, name) => {
    setEntry((e) => ({ ...e, lifts: e.lifts.map((l, i) => (i !== li ? l : { ...l, name })) }));
  };

  const save = () => {
    const clean = {
      date: entry.date,
      day: entry.day,
      lifts: entry.lifts
        .map((l) => ({ slot: l.slot, name: l.name, sets: l.sets.filter((s) => s.w !== "" || s.r !== "") }))
        .filter((l) => l.sets.length),
    };
    if (!clean.lifts.length) return;

    // PR detection: compare against history *before* this session
    const history = workouts.filter((x) => !(x.date === clean.date && x.day === clean.day));
    const prs = [];
    clean.lifts.forEach((l) => {
      const prevBest = bestFor(history, l.name);
      let sessionBest = null;
      l.sets.forEach((s) => {
        const wt = parseFloat(s.w), r = parseInt(s.r);
        if (!wt || !r) return;
        const score = e1rm(wt, r);
        if (!sessionBest || score > sessionBest.e1rm) sessionBest = { e1rm: score, w: wt, r };
      });
      if (sessionBest && (!prevBest || sessionBest.e1rm > prevBest.e1rm)) {
        prs.push(`${l.name}: ${sessionBest.w}${unit} × ${sessionBest.r}`);
      }
    });

    setWorkouts((w) => [...history, clean]);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    if (prs.length) {
      setPrMsg(prs);
      setTimeout(() => setPrMsg(null), 5000);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {Object.keys(PROGRAM).map((d) => (
          <button key={d} onClick={() => setDay(d)} style={pill(day === d)}>{d}</button>
        ))}
      </div>

      <div style={{ ...row, marginBottom: 12 }}>
        <span style={{ color: C.dim, fontSize: 13 }}>Date</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={startRest} style={timerBtn}>⏱ {settings.rest}s</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
        </div>
      </div>

      {entry.lifts.map((lift, li) => (
        <div key={lift.slot} style={liftCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ color: C.dim, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>{lift.slot}</span>
            <span style={{ color: C.accent, fontSize: 12 }}>{lift.target} reps</span>
          </div>

          <select value={lift.name} onChange={(e) => pickVariation(li, e.target.value)} style={select}>
            {lift.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>

          <button onClick={() => setVideoFor(lift.name)} style={videoBtn}>▶ Watch form demo</button>

          {lift.prev && lift.prev.name === lift.name && (
            <div style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
              Last: {lift.prev.sets.map((s) => `${s.w || "–"}×${s.r || "–"}`).join("  ")}
            </div>
          )}

          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {lift.sets.map((s, si) => (
              <div key={si} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: C.dim, fontSize: 12, width: 38 }}>Set {si + 1}</span>
                <input inputMode="decimal" placeholder={unit} value={s.w}
                  onChange={(e) => update(li, si, "w", e.target.value)} style={setInput} />
                <span style={{ color: C.dim }}>×</span>
                <input inputMode="numeric" placeholder="reps" value={s.r}
                  onChange={(e) => update(li, si, "r", e.target.value)}
                  onBlur={(e) => { if (e.target.value) startRest(); }}
                  style={setInput} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={save} style={saveBtn}>{saved ? "Saved ✓" : "Save session"}</button>

      {videoFor && <VideoModal name={videoFor} onClose={() => setVideoFor(null)} />}

      {restEnds && (
        <button style={restChip} onClick={() => setRestEnds(null)}>
          Rest {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")} — tap to skip
        </button>
      )}

      {prMsg && (
        <div style={prToast}>
          🏆 New PR{prMsg.length > 1 ? "s" : ""}!
          {prMsg.map((p) => <div key={p} style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>{p}</div>)}
        </div>
      )}
    </div>
  );
}

// ---------- Video modal ----------
const PICKED = {
  "Barbell bench press": "Pp8rHcFVIYg",
  "Back squat": "bEv6CCg2BC8",
};

function VideoModal({ name, onClose }) {
  const picked = PICKED[name];
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " proper form technique")}`;
  const src = picked
    ? `https://www.youtube-nocookie.com/embed/${picked}?rel=0`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(name + " proper form")}`;

  return (
    <div style={modalWrap} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ fontSize: 15 }}>{name}</strong>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden", background: "#000" }}>
          <iframe title={`${name} demo`} src={src}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        <a href={searchUrl} target="_blank" rel="noreferrer" style={moreLink}>More form videos on YouTube ↗</a>
      </div>
    </div>
  );
}

// ============================== BODY ==============================
function Body({ body, setBody, settings }) {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const unit = settings.unit;
  const mUnit = unit === "kg" ? "cm" : "in";

  const [form, setForm] = useState({ weight: "", sleep: "", protein: "", cardio: "", measurements: {} });

  useEffect(() => {
    const c = body.find((b) => b.date === date) || {};
    setForm({
      weight: c.weight ?? "", sleep: c.sleep ?? "", protein: c.protein ?? "",
      cardio: c.cardio ?? "", measurements: c.measurements ?? {},
    });
  }, [date, body]);

  const [saved, setSaved] = useState(false);
  const save = () => {
    const rec = { date, ...form };
    setBody((b) => [...b.filter((x) => x.date !== date), rec].sort((a, b2) => a.date.localeCompare(b2.date)));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div>
      <div style={{ ...row, marginBottom: 12 }}>
        <span style={{ color: C.dim, fontSize: 13 }}>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
      </div>

      <Card title="Daily">
        <Field label={`Bodyweight (${unit})`} v={form.weight} on={(v) => setForm({ ...form, weight: v })} />
        <Field label="Sleep (hours)" v={form.sleep} on={(v) => setForm({ ...form, sleep: v })} />
        <Field label="Protein (g)" v={form.protein} on={(v) => setForm({ ...form, protein: v })} />
        <Field label="Cardio (min)" v={form.cardio} on={(v) => setForm({ ...form, cardio: v })} last />
      </Card>

      <Card title={`Measurements (${mUnit})`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {MEASUREMENTS.map((m) => (
            <div key={m} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.dim, fontSize: 12 }}>{m}</span>
              <input inputMode="decimal" value={form.measurements[m] ?? ""}
                onChange={(e) => setForm({ ...form, measurements: { ...form.measurements, [m]: e.target.value } })}
                style={setInput} />
            </div>
          ))}
        </div>
      </Card>

      <button onClick={save} style={saveBtn}>{saved ? "Saved ✓" : "Save day"}</button>
    </div>
  );
}

// ============================== PROGRESS ==============================
function Progress({ workouts, body, settings }) {
  const unit = settings.unit;
  const mUnit = unit === "kg" ? "cm" : "in";

  // Exercises with logged data
  const exercises = useMemo(() => {
    const counts = {};
    workouts.forEach((w) => w.lifts.forEach((l) => {
      const hasData = l.sets.some((s) => parseFloat(s.w) && parseInt(s.r));
      if (hasData) counts[l.name] = (counts[l.name] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [workouts]);

  const [exercise, setExercise] = useState("");
  useEffect(() => { if (!exercise && exercises.length) setExercise(exercises[0]); }, [exercises, exercise]);

  // e1RM + top weight per session for selected exercise
  const exData = useMemo(() => {
    if (!exercise) return [];
    const rows = [];
    [...workouts].sort((a, b) => a.date.localeCompare(b.date)).forEach((w) => {
      let best = null, topW = 0;
      w.lifts.filter((l) => l.name === exercise).forEach((l) =>
        l.sets.forEach((s) => {
          const wt = parseFloat(s.w), r = parseInt(s.r);
          if (!wt || !r) return;
          const score = e1rm(wt, r);
          if (!best || score > best) best = score;
          if (wt > topW) topW = wt;
        })
      );
      if (best) rows.push({ date: fmtDate(w.date), e1RM: best, top: topW });
    });
    return rows;
  }, [workouts, exercise]);

  const record = useMemo(() => (exercise ? bestFor(workouts, exercise) : null), [workouts, exercise]);

  // Measurement trends
  const [measure, setMeasure] = useState(MEASUREMENTS[1]); // Waist default
  const mData = useMemo(
    () => body
      .filter((b) => b.measurements && b.measurements[measure])
      .map((b) => ({ date: fmtDate(b.date), v: parseFloat(b.measurements[measure]) }))
      .filter((p) => !isNaN(p.v)),
    [body, measure]
  );

  if (!exercises.length) {
    return <Empty>Log a few workouts and your strength charts will appear here.</Empty>;
  }

  return (
    <div>
      <Card title="Strength progress">
        <select value={exercise} onChange={(e) => setExercise(e.target.value)} style={{ ...select, marginBottom: 10 }}>
          {exercises.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        {record && (
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={recordBox}>
              <div style={{ color: C.dim, fontSize: 11 }}>BEST SET</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.accent }}>{record.w}{unit} × {record.r}</div>
              <div style={{ color: C.dim, fontSize: 11 }}>{fmtDate(record.date)}</div>
            </div>
            <div style={recordBox}>
              <div style={{ color: C.dim, fontSize: 11 }}>EST. 1RM</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.accent2 }}>{record.e1rm}{unit}</div>
              <div style={{ color: C.dim, fontSize: 11 }}>Epley formula</div>
            </div>
          </div>
        )}

        {exData.length > 1 ? (
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={exData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.dim, fontSize: 11 }} />
              <YAxis tick={{ fill: C.dim, fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="e1RM" stroke={C.accent2} strokeWidth={2.5} dot={{ r: 3 }} name={`est. 1RM (${unit})`} />
              <Line type="monotone" dataKey="top" stroke={C.accent} strokeWidth={2} dot={{ r: 3 }} name={`top weight (${unit})`} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty>Two or more sessions of this exercise will draw the trend.</Empty>}
        <div style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
          Estimated 1RM converts weight × reps into one comparable strength number — if this line climbs, you're getting stronger.
        </div>
      </Card>

      <Card title={`Measurement trend (${mUnit})`}>
        <select value={measure} onChange={(e) => setMeasure(e.target.value)} style={{ ...select, marginBottom: 10 }}>
          {MEASUREMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {mData.length > 1 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={mData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.dim, fontSize: 11 }} />
              <YAxis tick={{ fill: C.dim, fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={tip} />
              <Line type="monotone" dataKey="v" stroke={C.warn} strokeWidth={2.5} dot={{ r: 3 }} name={mUnit} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty>Log this measurement on two or more days to see its trend.</Empty>}
      </Card>

      <Card title="All records">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {exercises.map((ex) => {
            const r = bestFor(workouts, ex);
            return r ? (
              <div key={ex} style={{ ...row, fontSize: 13 }}>
                <span>{ex}</span>
                <span style={{ color: C.accent, fontWeight: 700 }}>{r.w}{unit} × {r.r}</span>
              </div>
            ) : null;
          })}
        </div>
      </Card>
    </div>
  );
}

// ============================== MORE ==============================
function More({ workouts, setWorkouts, body, setBody, settings, setSettings }) {
  const [section, setSection] = useState("settings");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["settings", "Settings"], ["data", "Data"], ["history", "History"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} style={pill(section === id)}>{label}</button>
        ))}
      </div>
      {section === "settings" && <Settings settings={settings} setSettings={setSettings} />}
      {section === "data" && <Data workouts={workouts} setWorkouts={setWorkouts} body={body} setBody={setBody} />}
      {section === "history" && <History workouts={workouts} setWorkouts={setWorkouts} body={body} setBody={setBody} />}
    </div>
  );
}

// ---------- Settings ----------
function Settings({ settings, setSettings }) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  return (
    <div>
      <Card title="Units & timer">
        <div style={{ ...row, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>Weight unit</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["kg", "lb"].map((u) => (
              <button key={u} onClick={() => set("unit", u)} style={pillSmall(settings.unit === u)}>{u}</button>
            ))}
          </div>
        </div>
        <div style={{ color: C.dim, fontSize: 11, marginBottom: 12, marginTop: -6 }}>
          Changes labels only — logged numbers aren't converted.
        </div>
        <Field label="Rest timer (seconds)" v={settings.rest} on={(v) => set("rest", parseInt(v) || 0)} last />
      </Card>

      <Card title="Targets">
        <Field label="Protein (g/day)" v={settings.proteinTarget} on={(v) => set("proteinTarget", parseInt(v) || 0)} />
        <Field label="Sleep (h/night)" v={settings.sleepTarget} on={(v) => set("sleepTarget", parseFloat(v) || 0)} />
        <Field label="Cardio (min/week)" v={settings.cardioTarget} on={(v) => set("cardioTarget", parseInt(v) || 0)} last />
      </Card>

      <Card title="Deload">
        <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
          Last deload: <span style={{ color: C.text }}>{settings.lastDeload ? fmtDate(settings.lastDeload) : "—"}</span>.
          A banner appears on Home after 6 weeks of training.
        </div>
        <button style={dataBtn} onClick={() => set("lastDeload", todayStr())}>Mark deload done today</button>
      </Card>
    </div>
  );
}

// ---------- Data (export / import) ----------
function Data({ workouts, setWorkouts, body, setBody }) {
  const [msg, setMsg] = useState("");
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const download = (filename, text, type) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportJSON = () => {
    const payload = { exportedAt: new Date().toISOString(), version: 1, workouts, body };
    download(`ppl-tracker-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    flash("JSON backup downloaded.");
  };

  const exportCSV = () => {
    const wRows = [["date", "day", "slot", "exercise", "set", "weight", "reps"]];
    workouts.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((w) =>
      w.lifts.forEach((l) =>
        l.sets.forEach((s, i) => wRows.push([w.date, w.day, l.slot || "", l.name, i + 1, s.w, s.r]))
      )
    );
    download(`ppl-workouts-${stamp()}.csv`, toCSV(wRows), "text/csv");

    const bRows = [["date", "weight", "sleep", "protein", "cardio", ...MEASUREMENTS]];
    body.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((b2) =>
      bRows.push([
        b2.date, b2.weight ?? "", b2.sleep ?? "", b2.protein ?? "", b2.cardio ?? "",
        ...MEASUREMENTS.map((m) => (b2.measurements && b2.measurements[m]) || ""),
      ])
    );
    download(`ppl-body-${stamp()}.csv`, toCSV(bRows), "text/csv");
    flash("Two CSV files downloaded (workouts + body).");
  };

  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.workouts) || !Array.isArray(data.body)) throw new Error("bad shape");
        setWorkouts(data.workouts);
        setBody(data.body);
        flash("Backup restored.");
      } catch {
        flash("Couldn't read that file. Use a JSON backup from this app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <Card title="Export">
        <p style={dataNote}>JSON is a complete backup you can re-import here; CSV opens in Excel or Google Sheets.</p>
        <button onClick={exportJSON} style={dataBtn}>Export JSON backup</button>
        <button onClick={exportCSV} style={{ ...dataBtn, marginTop: 8 }}>Export CSV (workouts + body)</button>
      </Card>

      <Card title="Import / restore">
        <p style={dataNote}>Restore from a JSON backup. This replaces current data — export first if unsure.</p>
        <label style={{ ...dataBtn, display: "block", textAlign: "center", cursor: "pointer" }}>
          Choose JSON file…
          <input type="file" accept="application/json" onChange={importJSON} style={{ display: "none" }} />
        </label>
      </Card>

      <Card title="Summary">
        <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.7 }}>
          {workouts.length} workout session{workouts.length === 1 ? "" : "s"} logged.<br />
          {body.length} body log{body.length === 1 ? "" : "s"} recorded.
        </div>
      </Card>

      {msg && <div style={toast}>{msg}</div>}
    </div>
  );
}

function toCSV(rows) {
  return rows.map((r) =>
    r.map((cell) => {
      const s = String(cell ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  ).join("\n");
}

// ---------- History ----------
function History({ workouts, setWorkouts, body, setBody }) {
  const items = useMemo(() => {
    const w = workouts.map((x) => ({ type: "w", date: x.date, data: x }));
    const b = body
      .filter((x) => x.weight || x.sleep || x.protein || x.cardio || Object.keys(x.measurements || {}).length)
      .map((x) => ({ type: "b", date: x.date, data: x }));
    return [...w, ...b].sort((a, b2) => b2.date.localeCompare(a.date));
  }, [workouts, body]);

  if (!items.length) return <Empty>No history yet. Log a workout or body data to get started.</Empty>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={liftCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 14 }}>
              {fmtDate(it.date)} · {it.type === "w" ? `${it.data.day} session` : "Body log"}
            </strong>
            <button
              onClick={() => {
                if (it.type === "w") setWorkouts((w) => w.filter((x) => !(x.date === it.date && x.day === it.data.day)));
                else setBody((b) => b.filter((x) => x.date !== it.date));
              }}
              style={delBtn}
            >
              Delete
            </button>
          </div>
          {it.type === "w" ? (
            <div style={{ marginTop: 6, color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
              {it.data.lifts.map((l) => (
                <div key={l.name}>
                  <span style={{ color: C.text }}>{l.name}:</span>{" "}
                  {l.sets.map((s) => `${s.w || "–"}×${s.r || "–"}`).join("  ")}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 6, color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
              {it.data.weight && <span style={chip}>⚖ {it.data.weight}</span>}
              {it.data.sleep && <span style={chip}>😴 {it.data.sleep}h</span>}
              {it.data.protein && <span style={chip}>🍗 {it.data.protein}g</span>}
              {it.data.cardio && <span style={chip}>🏃 {it.data.cardio}m</span>}
              {Object.entries(it.data.measurements || {}).filter(([, v]) => v).map(([k, v]) => (
                <span key={k} style={chip}>{k} {v}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Small components ----------
function Stat({ label, value, sub, color }) {
  return (
    <div style={{ ...cardBase, padding: 14 }}>
      <div style={{ color: C.dim, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1, margin: "2px 0" }}>{value}</div>
      <div style={{ color: C.dim, fontSize: 11 }}>{sub}</div>
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ ...cardBase, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 10, letterSpacing: 0.5 }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}
function Field({ label, v, on, last }) {
  return (
    <div style={{ ...row, paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10, borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <span style={{ color: C.text, fontSize: 14 }}>{label}</span>
      <input inputMode="decimal" value={v} onChange={(e) => on(e.target.value)} style={input} placeholder="—" />
    </div>
  );
}
function Empty({ children }) {
  return <div style={{ color: C.dim, fontSize: 13, textAlign: "center", padding: "20px 10px" }}>{children}</div>;
}

// ---------- Styles ----------
const wrap = {
  display: "flex", flexDirection: "column", height: "100vh", maxWidth: 480, margin: "0 auto",
  background: C.bg, color: C.text, fontFamily: "system-ui, -apple-system, sans-serif",
};
const nav = { display: "flex", gap: 5, padding: "8px 12px 10px", borderBottom: `1px solid ${C.line}` };
const tabBtn = (on) => ({
  flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
  background: on ? C.accent : C.panel2, color: on ? "#0A0E13" : C.dim, whiteSpace: "nowrap",
});
const cardBase = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14 };
const liftCard = { ...cardBase, padding: 12, marginBottom: 10 };
const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const input = {
  background: C.panel2, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8,
  padding: "8px 10px", fontSize: 14, width: 110, textAlign: "right",
};
const setInput = {
  background: C.panel2, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8,
  padding: "8px 10px", fontSize: 14, width: "100%", textAlign: "center", minWidth: 0, flex: 1,
};
const select = {
  width: "100%", background: C.panel2, border: `1px solid ${C.line}`, color: C.text,
  borderRadius: 8, padding: "9px 10px", fontSize: 15, fontWeight: 600, appearance: "none",
};
const pill = (on) => ({
  flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${on ? C.accent : C.line}`, cursor: "pointer",
  background: on ? "rgba(74,222,128,0.12)" : C.panel, color: on ? C.accent : C.dim, fontWeight: 700, fontSize: 14,
});
const pillSmall = (on) => ({
  padding: "6px 16px", borderRadius: 8, border: `1px solid ${on ? C.accent : C.line}`, cursor: "pointer",
  background: on ? "rgba(74,222,128,0.12)" : C.panel2, color: on ? C.accent : C.dim, fontWeight: 700, fontSize: 13,
});
const saveBtn = {
  width: "100%", padding: 14, marginTop: 6, borderRadius: 12, border: "none", cursor: "pointer",
  background: C.accent, color: "#0A0E13", fontWeight: 800, fontSize: 15,
};
const delBtn = {
  background: "transparent", border: `1px solid ${C.line}`, color: C.dim, borderRadius: 7,
  padding: "4px 10px", fontSize: 12, cursor: "pointer",
};
const chip = {
  display: "inline-block", background: C.panel2, borderRadius: 6, padding: "3px 8px",
  fontSize: 12, marginRight: 6, marginTop: 4, color: C.text,
};
const tip = { background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text };
const videoBtn = {
  width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 8, cursor: "pointer",
  background: "transparent", border: `1px solid ${C.accent2}`, color: C.accent2, fontSize: 13, fontWeight: 600,
};
const timerBtn = {
  background: C.panel2, border: `1px solid ${C.accent2}`, color: C.accent2, borderRadius: 8,
  padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const restChip = {
  position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
  background: C.accent2, color: "#06222E", border: "none", borderRadius: 24,
  padding: "12px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer", zIndex: 55,
  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
};
const prToast = {
  position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)",
  background: C.warn, color: "#3F2D04", padding: "12px 20px", borderRadius: 12,
  fontWeight: 800, fontSize: 14, zIndex: 60, maxWidth: "92%", textAlign: "center",
  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
};
const deloadBanner = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
  background: C.warn, color: "#3F2D04", borderRadius: 12, padding: "12px 14px", marginBottom: 14,
  fontSize: 14,
};
const deloadBtn = {
  background: "#3F2D04", color: C.warn, border: "none", borderRadius: 8,
  padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0,
};
const recordBox = { ...cardBase, background: C.panel2, padding: 10, flex: 1, textAlign: "center" };
const modalWrap = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
  alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
};
const modalCard = {
  width: "100%", maxWidth: 440, background: C.panel, border: `1px solid ${C.line}`,
  borderRadius: 16, padding: 16,
};
const closeBtn = {
  background: C.panel2, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8,
  width: 32, height: 32, cursor: "pointer", fontSize: 14,
};
const moreLink = { display: "inline-block", marginTop: 12, color: C.accent2, fontSize: 13, textDecoration: "none", fontWeight: 600 };
const dataNote = { color: C.dim, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" };
const dataBtn = {
  width: "100%", padding: 13, borderRadius: 10, border: "none", cursor: "pointer",
  background: C.accent, color: "#0A0E13", fontWeight: 700, fontSize: 14,
};
const toast = {
  position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
  background: C.accent, color: "#0A0E13", padding: "10px 18px", borderRadius: 10,
  fontWeight: 700, fontSize: 13, maxWidth: "90%", textAlign: "center", zIndex: 60,
};
