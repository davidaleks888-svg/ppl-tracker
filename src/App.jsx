import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine,
} from "recharts";
import {
  DEFAULT_PROGRAM, DAY_ORDER, GIRTHS, SKINFOLDS_M, SKINFOLDS_F, DEFAULT_SETTINGS, DEFAULT_PLAN,
  loadKey, saveKey, todayStr, fmtDate, fmtFull, mondayOf, e1rm, avg,
  bmi, bmiClass, bodyFatJP3, bmr, leanMass, bestFor, nextDay,
  nowMs, nowClock, fmtClock, fmtDur, hourLabel, dayPart, sessionVolume, timeOfDayStats, restGaps,
} from "./core.js";
import { coachInsights, priorityAlerts } from "./coach.js";
import { C, FONT, installFonts } from "./theme.js";
import { Eyebrow, Card, Stat, Btn, Field, Select, Empty, Pill, chartTip } from "./ui.jsx";
import Celebrate from "./Celebrate.jsx";

// Reusable draft autosave for single-screen forms (Body, Food entry, Cardio).
// Persists `value` under draft:<key>, restores it on mount, flushes on
// background/close, and clears when you call the returned clear().
// `active(value)` decides whether the current value is worth saving.
function useFormDraft(key, value, setValue, active) {
  const K = "draft:" + key;
  const ready = React.useRef(false);

  // restore on mount
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(loadKey(K, null)).then((d) => {
      if (cancelled) return;
      if (d && active(d)) setValue(d);
      setTimeout(() => { ready.current = true; }, 0);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autosave on change
  useEffect(() => {
    if (!ready.current) return;
    if (active(value)) saveKey(K, value);
    else saveKey(K, null);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // flush on hide/close
  useEffect(() => {
    const flush = () => { try { if (active(value)) saveKey(K, value); } catch { /* ignore */ } };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => { ready.current = false; Promise.resolve(saveKey(K, null)); setTimeout(() => { ready.current = true; }, 0); };
  return clear;
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [loaded, setLoaded] = useState(false);

  const [workouts, setWorkouts] = useState([]);   // strength sessions
  const [cardio, setCardio] = useState([]);        // {date, type, minutes, zone, notes}
  const [body, setBody] = useState([]);            // {date, weight, sleep, stretch, girths:{}, skinfolds:{}}
  const [foods, setFoods] = useState([]);          // {date, name, kcal, protein, carbs, fat, qty}
  const [photos, setPhotos] = useState([]);        // {date, dataUrl, note}
  const [program, setProgram] = useState(DEFAULT_PROGRAM);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [checks, setChecks] = useState({}); // { "YYYY-MM-DD": { "item": true } }
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [celebrate, setCelebrate] = useState(null);

  useEffect(() => { installFonts(); }, []);

  useEffect(() => {
    setWorkouts(loadKey("workouts", []));
    setCardio(loadKey("cardio", []));
    setBody(loadKey("body", []));
    setFoods(loadKey("foods", []));
    setPhotos(loadKey("photos", []));
    setProgram(loadKey("program", DEFAULT_PROGRAM));
    setPlan({ ...DEFAULT_PLAN, ...loadKey("plan", {}) });
    setChecks(loadKey("checks", {}));
    const s = { ...DEFAULT_SETTINGS, ...loadKey("settings", {}) };
    if (!s.lastDeload) s.lastDeload = todayStr();
    setSettings(s);
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveKey("workouts", workouts); }, [workouts, loaded]);
  useEffect(() => { if (loaded) saveKey("cardio", cardio); }, [cardio, loaded]);
  useEffect(() => { if (loaded) saveKey("body", body); }, [body, loaded]);
  useEffect(() => { if (loaded) saveKey("foods", foods); }, [foods, loaded]);
  useEffect(() => { if (loaded) saveKey("photos", photos); }, [photos, loaded]);
  useEffect(() => { if (loaded) saveKey("program", program); }, [program, loaded]);
  useEffect(() => { if (loaded) saveKey("plan", plan); }, [plan, loaded]);
  useEffect(() => { if (loaded) saveKey("checks", checks); }, [checks, loaded]);
  useEffect(() => { if (loaded) saveKey("settings", settings); }, [settings, loaded]);

  if (!loaded) {
    return <div style={{ ...shell, alignItems: "center", justifyContent: "center", color: C.dim }}>Loading…</div>;
  }

  const tabs = [["home", "Home"], ["train", "Train"], ["body", "Body"], ["food", "Food"], ["plan", "Plan"], ["progress", "Progress"], ["more", "More"]];

  return (
    <div style={shell}>
      <header style={{ padding: "20px 18px 8px" }}>
        <Eyebrow>Push · Pull · Legs</Eyebrow>
        <h1 style={{ margin: "3px 0 0", fontFamily: FONT.display, fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: 0.2 }}>
          Your Tracker
        </h1>
      </header>

      <nav style={navBar}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={navTab(tab === id)}>{label}</button>
        ))}
      </nav>

      <main style={{ flex: 1, overflowY: "auto", padding: "16px 16px 96px" }}>
        {tab === "home" && <Home {...{ workouts, cardio, body, foods, settings, setSettings }} />}
        {tab === "train" && <Train {...{ workouts, setWorkouts, cardio, setCardio, program, settings, setCelebrate }} />}
        {tab === "body" && <Body {...{ body, setBody, photos, setPhotos, settings }} />}
        {tab === "food" && <Food {...{ foods, setFoods, settings }} />}
        {tab === "plan" && <Plan {...{ plan, setPlan, checks, setChecks, settings, setSettings }} />}
        {tab === "progress" && <Progress {...{ workouts, body, photos, settings }} />}
        {tab === "more" && <More {...{ workouts, setWorkouts, cardio, setCardio, body, setBody, foods, setFoods, photos, setPhotos, program, setProgram, plan, setPlan, checks, setChecks, settings, setSettings }} />}
      </main>

      {celebrate && <Celebrate data={celebrate} onClose={() => setCelebrate(null)} />}
    </div>
  );
}

// ============================== HOME ==============================
function Home({ workouts, cardio, body, foods, settings, setSettings }) {
  const unit = settings.unit;

  const lastStrength = useMemo(
    () => [...workouts].sort((a, b) => b.date.localeCompare(a.date))[0],
    [workouts]
  );
  const upcoming = useMemo(() => nextDay(workouts), [workouts]);

  const weightData = useMemo(
    () => body.filter((b) => b.weight).map((b) => ({ date: fmtDate(b.date), v: +b.weight })),
    [body]
  );

  const last7 = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const todayKcal = foods.filter((f) => f.date === todayStr()).reduce((a, f) => a + (+f.kcal || 0), 0);
    return {
      sessions: workouts.filter((w) => w.date >= cutoff).length,
      cardioMin: cardio.filter((c) => c.date >= cutoff).reduce((a, c) => a + (+c.minutes || 0), 0),
      avgSleep: avg(body.filter((b) => b.date >= cutoff && b.sleep).map((b) => +b.sleep)),
      todayKcal,
    };
  }, [workouts, cardio, body, foods]);

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
    return Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0])).slice(-8)
      .map(([wk, t]) => ({ date: fmtDate(wk), v: Math.round(t) }));
  }, [workouts]);

  const weeksSinceDeload = useMemo(() => {
    if (!settings.lastDeload) return 0;
    return Math.floor((Date.now() - new Date(settings.lastDeload + "T00:00").getTime()) / (7 * 864e5));
  }, [settings.lastDeload]);

  const insights = useMemo(
    () => coachInsights({ workouts, cardio, body, foods, settings }),
    [workouts, cardio, body, foods, settings]
  );
  const goalLabel = { muscle: "Build muscle", cut: "Cut / lose fat", longevity: "Longevity", maintain: "Maintain" }[settings.goal] || "Build muscle";
  const sevColor = { good: C.sage, info: C.dim, warn: C.rose, alert: C.rose };
  const sevBg = { good: C.sageSoft, info: "transparent", warn: "rgba(251,191,36,0.10)", alert: "rgba(251,191,36,0.14)" };

  return (
    <div>
      {/* Up next — the hero */}
      <section style={{ ...heroCard }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 80% at 100% 0%, ${C.goldSoft}, transparent 60%)`, pointerEvents: "none" }} />
        <Eyebrow>Up next</Eyebrow>
        <div style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: C.ink, lineHeight: 1.1, margin: "6px 0 4px" }}>
          {upcoming} day
        </div>
        <div style={{ color: C.dim, fontSize: 13 }}>
          {lastStrength ? `Last: ${lastStrength.day} · ${fmtFull(lastStrength.date)}` : "No sessions logged yet — start with Push."}
        </div>
      </section>

      {weeksSinceDeload >= 6 && (
        <div style={deload}>
          <div>
            <strong style={{ fontWeight: 700 }}>Deload week suggested</strong>
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>{weeksSinceDeload} weeks since your last one. Halve the volume, then resume.</div>
          </div>
          <button style={deloadBtn} onClick={() => setSettings({ ...settings, lastDeload: todayStr() })}>Mark done</button>
        </div>
      )}

      <Card title="Coach"
        action={<span style={{ fontSize: 11, color: C.gold, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{goalLabel}</span>}>
        {insights.length === 0 ? (
          <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
            Log a few workouts and body entries and I'll start reading your trends — plateaus, gaining pace, sleep, and more.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.map((it, i) => (
              <div key={i} style={{ background: sevBg[it.severity], border: `1px solid ${it.severity === "info" ? C.line : sevColor[it.severity]}`, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: sevColor[it.severity], flexShrink: 0 }} />
                  <strong style={{ fontSize: 13, color: C.ink }}>{it.title}</strong>
                </div>
                <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.5 }}>{it.detail}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ color: C.faint, fontSize: 10, marginTop: 10, lineHeight: 1.5 }}>
          Guidance from your own trends — not medical advice. Anything health-related is informational; consult a doctor for clinical decisions.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "14px 0" }}>
        <Stat label="Sessions · 7d" value={last7.sessions} sub="of 3 target" accent={C.gold} />
        <Stat label="Cardio · 7d" value={`${last7.cardioMin}m`} sub={`target ${settings.cardioTarget}m`} accent={C.sage} />
        <Stat label="Sleep avg" value={last7.avgSleep ? `${last7.avgSleep}h` : "—"} sub={`target ${settings.sleepTarget}h`} accent={C.gold} />
        <Stat label="Today · kcal" value={last7.todayKcal || "—"} sub={`target ${settings.calorieTarget}`} accent={C.sage} />
      </div>

      <Card title="Bodyweight">
        {weightData.length > 1 ? (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={weightData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} />
              <YAxis tick={{ fill: C.faint, fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={chartTip} />
              <Line type="monotone" dataKey="v" stroke={C.gold} strokeWidth={2.5} dot={false} name={unit} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty>Log your weight in Body to draw this trend.</Empty>}
      </Card>

      <Card title="Weekly volume">
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={volumeData} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} />
              <YAxis tick={{ fill: C.faint, fontSize: 11 }} />
              <Tooltip contentStyle={chartTip} />
              <Bar dataKey="v" fill={C.sage} radius={[5, 5, 0, 0]} name={`${unit} lifted`} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty>Total weight moved per week. Log a session to begin.</Empty>}
      </Card>
    </div>
  );
}

// ============================== TRAIN ==============================
function Train({ workouts, setWorkouts, cardio, setCardio, program, settings, setCelebrate }) {
  const [mode, setMode] = useState("strength"); // strength | cardio
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Pill active={mode === "strength"} onClick={() => setMode("strength")} style={{ flex: 1, textAlign: "center" }}>Strength</Pill>
        <Pill active={mode === "cardio"} onClick={() => setMode("cardio")} style={{ flex: 1, textAlign: "center" }}>Cardio</Pill>
      </div>
      {mode === "strength"
        ? <Strength {...{ workouts, setWorkouts, program, settings, setCelebrate }} />
        : <CardioLog {...{ cardio, setCardio, settings, setCelebrate }} />}
    </div>
  );
}

function Strength({ workouts, setWorkouts, program, settings, setCelebrate }) {
  const unit = settings.unit;
  const [day, setDay] = useState(() => nextDay(workouts));
  const [date, setDate] = useState(todayStr());
  const [entry, setEntry] = useState(null);
  const [videoFor, setVideoFor] = useState(null);
  const [startMs, setStartMs] = useState(null); // when first set was logged
  const [elapsed, setElapsed] = useState(0);
  const [restored, setRestored] = useState(false); // showed "draft restored" note
  const draftReady = React.useRef(false); // guards autosave until initial build/restore done

  // live elapsed-time ticker once the session has started
  useEffect(() => {
    if (!startMs) return;
    const id = setInterval(() => setElapsed(Date.now() - startMs), 1000);
    return () => clearInterval(id);
  }, [startMs]);

  // rest timer
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
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.07; o.start();
        setTimeout(() => { o.stop(); ctx.close(); }, 320);
      } catch { /* ignore */ }
      setRestEnds(null);
    }
  }, [restLeft, restEnds]);
  const startRest = () => setRestEnds(Date.now() + settings.rest * 1000);

  const last = useMemo(
    () => workouts.filter((w) => w.day === day).sort((a, b) => b.date.localeCompare(a.date))[0],
    [workouts, day]
  );
  const lastRef = React.useRef(last);
  lastRef.current = last;

  const DRAFT_KEY = "draftStrength";

  // Build the session — restoring an autosaved draft if one matches this day+date.
  useEffect(() => {
    draftReady.current = false;
    let cancelled = false;

    const buildFresh = () => {
      const ls = lastRef.current;
      const lifts = (program[day] || []).map((ex) => {
        const prev = ls?.lifts.find((l) => l.slot === ex.slot);
        const chosen = prev?.name && ex.options.includes(prev.name) ? prev.name : ex.options[0];
        const sets = Array.from({ length: ex.sets }, (_, i) => ({ w: prev?.sets[i]?.w ?? "", r: "", ts: null }));
        return { slot: ex.slot, name: chosen, options: ex.options, target: ex.reps, prev, sets };
      });
      return { date, day, lifts };
    };

    Promise.resolve(loadKey(DRAFT_KEY, null)).then((draft) => {
      if (cancelled) return;
      if (draft && draft.entry && draft.entry.day === day && draft.entry.date === date) {
        // re-attach the live "prev" reference (not stored in the draft)
        const ls = lastRef.current;
        const lifts = draft.entry.lifts.map((l) => ({
          ...l,
          prev: ls?.lifts.find((x) => x.slot === l.slot) || null,
        }));
        setEntry({ ...draft.entry, lifts });
        setStartMs(draft.startMs || null);
        setElapsed(draft.startMs ? Date.now() - draft.startMs : 0);
        setRestored(true);
        setTimeout(() => setRestored(false), 4000);
      } else {
        setEntry(buildFresh());
        setStartMs(null);
        setElapsed(0);
      }
      // allow autosave on the next tick, after state settles
      setTimeout(() => { draftReady.current = true; }, 0);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, date, program]);

  // Autosave the in-progress draft whenever it changes (after build/restore).
  useEffect(() => {
    if (!draftReady.current || !entry) return;
    // strip the non-serializable/contextual "prev" before saving
    const slim = { ...entry, lifts: entry.lifts.map(({ prev, ...l }) => l) };
    saveKey(DRAFT_KEY, { entry: slim, startMs });
  }, [entry, startMs]);

  // Extra safety: force a draft flush when the app is backgrounded or closed,
  // in case it happens between keystroke and the autosave effect.
  useEffect(() => {
    const flush = () => {
      if (!entry) return;
      const slim = { ...entry, lifts: entry.lifts.map(({ prev, ...l }) => l) };
      try { saveKey(DRAFT_KEY, { entry: slim, startMs }); } catch { /* ignore */ }
    };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [entry, startMs]);

  if (!entry) return null;

  const update = (li, si, f, v) => setEntry((e) => ({
    ...e, lifts: e.lifts.map((l, i) => i !== li ? l : { ...l, sets: l.sets.map((s, j) => j !== si ? s : { ...s, [f]: v }) }),
  }));
  // Update a weight, and auto-fill the SAME weight into later sets that are
  // still empty — since the working weight is usually the same across sets.
  const updateWeight = (li, si, v) => setEntry((e) => ({
    ...e, lifts: e.lifts.map((l, i) => {
      if (i !== li) return l;
      return {
        ...l,
        sets: l.sets.map((s, j) => {
          if (j === si) return { ...s, w: v };
          if (j > si && (s.w === "" || s.w == null)) return { ...s, w: v }; // fill empties below
          return s;
        }),
      };
    }),
  }));
  const setNote = (li, field, v) => setEntry((e) => ({ ...e, lifts: e.lifts.map((l, i) => i !== li ? l : { ...l, [field]: v }) }));
  // Stamp a set's completion time when its reps are filled in (live workout only).
  const stampSet = (li, si) => {
    const t = Date.now();
    if (!startMs) setStartMs(t);
    setEntry((e) => ({
      ...e, lifts: e.lifts.map((l, i) => i !== li ? l : { ...l, sets: l.sets.map((s, j) => j !== si ? s : { ...s, ts: t }) }),
    }));
  };
  const pick = (li, name) => setEntry((e) => ({ ...e, lifts: e.lifts.map((l, i) => i !== li ? l : { ...l, name }) }));
  const addSet = (li) => setEntry((e) => ({ ...e, lifts: e.lifts.map((l, i) => i !== li ? l : { ...l, sets: [...l.sets, { w: l.sets.at(-1)?.w ?? "", r: "", ts: null }] }) }));
  const addExercise = () => setEntry((e) => ({
    ...e, lifts: [...e.lifts, { slot: "Custom", name: "Custom exercise", options: ["Custom exercise"], custom: true, target: "—", sets: [{ w: "", r: "", ts: null }] }],
  }));
  const renameCustom = (li, name) => setEntry((e) => ({ ...e, lifts: e.lifts.map((l, i) => i !== li ? l : { ...l, name, options: [name] }) }));

  const save = () => {
    const endMs = startMs ? Date.now() : null;
    const clean = {
      date: entry.date, day: entry.day,
      startMs: startMs || null,
      endMs,
      lifts: entry.lifts.map((l) => ({
        slot: l.slot, name: l.name,
        note: l.note || "", rpe: l.rpe || "",
        sets: l.sets.filter((s) => s.w !== "" || s.r !== "").map((s) => ({ w: s.w, r: s.r, ts: s.ts || null })),
      })).filter((l) => l.sets.length),
    };
    if (!clean.lifts.length) return;

    const history = workouts.filter((x) => !(x.date === clean.date && x.day === clean.day));
    const prs = [];
    let volume = 0, setCount = 0;
    clean.lifts.forEach((l) => {
      const prevBest = bestFor(history, l.name);
      let sBest = null;
      l.sets.forEach((s) => {
        const wt = parseFloat(s.w), r = parseInt(s.r);
        if (!wt || !r) return;
        volume += wt * r; setCount++;
        const sc = e1rm(wt, r);
        if (!sBest || sc > sBest.e1rm) sBest = { e1rm: sc, w: wt, r };
      });
      if (sBest && (!prevBest || sBest.e1rm > prevBest.e1rm)) prs.push(`${l.name}: ${sBest.w}${unit} × ${sBest.r}`);
    });
    clean.prCount = prs.length;

    // duration stats (only meaningful for a live-logged session)
    const durMs = clean.startMs && clean.endMs ? clean.endMs - clean.startMs : null;
    const durStat = durMs ? [{ label: "Duration", value: fmtDur(durMs) }] : [];

    setWorkouts([...history, clean]);
    setCelebrate({
      kind: "strength", title: `${clean.day} day`,
      stats: [
        { label: "Volume", value: `${Math.round(volume)}` },
        { label: "Sets", value: setCount },
        ...durStat,
      ],
      prs,
    });

    // session committed — clear the autosaved draft and start a fresh sheet
    draftReady.current = false;
    Promise.resolve(saveKey(DRAFT_KEY, null));
    const ls = lastRef.current;
    const lifts = (program[day] || []).map((ex) => {
      const prev = ls?.lifts.find((l) => l.slot === ex.slot);
      const chosen = prev?.name && ex.options.includes(prev.name) ? prev.name : ex.options[0];
      const sets = Array.from({ length: ex.sets }, (_, i) => ({ w: "", r: "", ts: null }));
      return { slot: ex.slot, name: chosen, options: ex.options, target: ex.reps, prev, sets };
    });
    setEntry({ date, day, lifts });
    setStartMs(null);
    setElapsed(0);
    setTimeout(() => { draftReady.current = true; }, 0);
  };

  const discardDraft = () => {
    if (!confirm("Discard this in-progress session? Logged-but-unsaved sets will be cleared.")) return;
    draftReady.current = false;
    Promise.resolve(saveKey(DRAFT_KEY, null));
    const ls = lastRef.current;
    const lifts = (program[day] || []).map((ex) => {
      const prev = ls?.lifts.find((l) => l.slot === ex.slot);
      const chosen = prev?.name && ex.options.includes(prev.name) ? prev.name : ex.options[0];
      const sets = Array.from({ length: ex.sets }, (_, i) => ({ w: prev?.sets[i]?.w ?? "", r: "", ts: null }));
      return { slot: ex.slot, name: chosen, options: ex.options, target: ex.reps, prev, sets };
    });
    setEntry({ date, day, lifts });
    setStartMs(null);
    setElapsed(0);
    setTimeout(() => { draftReady.current = true; }, 0);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {DAY_ORDER.map((d) => <Pill key={d} active={day === d} onClick={() => setDay(d)} style={{ flex: 1, textAlign: "center" }}>{d}</Pill>)}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={startRest} style={timerBtn}>Rest · {settings.rest}s</button>
        {startMs
          ? <span style={{ color: C.gold, fontSize: 14, fontWeight: 700 }}>● {fmtDur(elapsed)}</span>
          : <span style={{ color: C.faint, fontSize: 12 }}>timer starts on first set</span>}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={dateInput} />
      </div>

      {restored && (
        <div style={{ background: C.sageSoft, border: `1px solid ${C.sage}`, color: C.ink, borderRadius: 12, padding: "11px 14px", marginBottom: 12, fontSize: 13 }}>
          Restored your in-progress session. Keep going where you left off.
        </div>
      )}

      {entry.lifts.map((lift, li) => (
        <Card key={li} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ color: C.gold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>{lift.slot}</span>
            <span style={{ color: C.dim, fontSize: 12 }}>{lift.target} reps</span>
          </div>

          {lift.custom ? (
            <input value={lift.name} onChange={(e) => renameCustom(li, e.target.value)} placeholder="Name this exercise"
              style={{ width: "100%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 12, padding: "12px 13px", fontSize: 15, fontWeight: 500 }} />
          ) : (
            <Select value={lift.name} onChange={(v) => pick(li, v)}>
              {lift.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          )}

          <button onClick={() => setVideoFor(lift.name)} style={demoBtn}>Watch form demo ↗</button>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
            {/* header row */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: C.faint, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>
              <span style={{ width: 34 }}>Set</span>
              <span style={{ flex: 1, textAlign: "center" }}>{unit}</span>
              <span style={{ width: 14 }} />
              <span style={{ flex: 1, textAlign: "center" }}>reps</span>
              {lift.prev && lift.prev.name === lift.name && <span style={{ width: 64, textAlign: "right" }}>last</span>}
            </div>
            {lift.sets.map((s, si) => {
              const prevSet = (lift.prev && lift.prev.name === lift.name) ? lift.prev.sets[si] : null;
              return (
                <div key={si} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: C.faint, fontSize: 12, width: 34 }}>{si + 1}</span>
                  <input inputMode="decimal" placeholder={prevSet?.w ? String(prevSet.w) : unit} value={s.w}
                    onChange={(e) => updateWeight(li, si, e.target.value)} style={setInput} />
                  <span style={{ color: C.faint }}>×</span>
                  <input inputMode="numeric" placeholder={prevSet?.r ? String(prevSet.r) : "reps"} value={s.r}
                    onChange={(e) => update(li, si, "r", e.target.value)}
                    onBlur={(e) => { if (e.target.value) { stampSet(li, si); startRest(); } }} style={setInput} />
                  {(lift.prev && lift.prev.name === lift.name) && (
                    <span style={{ color: C.faint, fontSize: 11, width: 64, textAlign: "right" }}>
                      {prevSet ? `${prevSet.w || "–"}×${prevSet.r || "–"}` : "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => addSet(li)} style={addSetBtn}>+ Add set</button>

          {/* difficulty + note */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <span style={{ color: C.faint, fontSize: 11, width: 34 }}>RPE</span>
            <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
              {["easy", "6", "7", "8", "9", "max"].map((v) => (
                <button key={v} onClick={() => setNote(li, "rpe", lift.rpe === v ? "" : v)}
                  style={{
                    padding: "5px 9px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                    border: `1px solid ${lift.rpe === v ? C.gold : C.line}`,
                    background: lift.rpe === v ? C.goldSoft : "transparent",
                    color: lift.rpe === v ? C.gold : C.dim,
                  }}>{v}</button>
              ))}
            </div>
          </div>
          <input value={lift.note || ""} onChange={(e) => setNote(li, "note", e.target.value)}
            placeholder="Note — how it felt, form cues, niggles…"
            style={{ width: "100%", marginTop: 8, background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: FONT.body }} />
        </Card>
      ))}

      <Btn variant="quiet" onClick={addExercise} style={{ marginBottom: 10 }}>+ Add custom exercise</Btn>
      <Btn variant="solid" onClick={save}>Finish & save session</Btn>
      {(startMs || entry.lifts.some((l) => l.sets.some((s) => s.w !== "" || s.r !== ""))) && (
        <button onClick={discardDraft} style={{ width: "100%", marginTop: 10, padding: "11px 0", borderRadius: 12, cursor: "pointer", background: "transparent", border: `1px solid ${C.line}`, color: C.faint, fontSize: 13, fontFamily: FONT.body }}>
          Discard in-progress session
        </button>
      )}

      {videoFor && <VideoModal name={videoFor} onClose={() => setVideoFor(null)} />}

      {restEnds && (
        <button onClick={() => setRestEnds(null)} style={restChip}>
          Rest {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")} · tap to skip
        </button>
      )}
    </div>
  );
}

function CardioLog({ cardio, setCardio, settings, setCelebrate }) {
  const [form, setForm] = useState({ date: todayStr(), time: "", type: "Zone 2", minutes: "", zone: "2", notes: "" });
  const types = ["Zone 2", "HIIT", "Run", "Cycle", "Walk", "Row", "Swim", "Other"];
  // autosave in-progress cardio entry (worth saving once minutes or notes are present)
  const clearDraft = useFormDraft("cardio", form, setForm, (f) => f && (f.minutes || f.notes));

  const save = () => {
    if (!form.minutes) return;
    const rec = { ...form, minutes: +form.minutes, time: form.time || nowClock() };
    setCardio([...cardio.filter((c) => !(c.date === rec.date && c.type === rec.type)), rec].sort((a, b) => a.date.localeCompare(b.date)));
    setCelebrate({
      kind: "cardio", title: `${rec.type}`,
      stats: [{ label: "Minutes", value: rec.minutes }, { label: "Zone", value: rec.zone || "—" }],
      prs: [],
    });
    clearDraft();
    setForm({ ...form, minutes: "", notes: "" });
  };

  const recent = [...cardio].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div>
      <Card title="Log cardio">
        <div style={{ ...row, marginBottom: 4, gap: 8 }}>
          <span style={{ color: C.ink, fontSize: 14 }}>Date & time</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={dateInput} />
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={dateInput} />
          </div>
        </div>
        <div style={{ margin: "10px 0" }}>
          <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <Field label="Minutes" value={form.minutes} onChange={(v) => setForm({ ...form, minutes: v })} inputMode="numeric" placeholder="0" />
        <Field label="Zone / effort" value={form.zone} onChange={(v) => setForm({ ...form, zone: v })} placeholder="2" />
        <div style={{ marginTop: 12 }}>
          <Btn variant="sage" onClick={save}>Finish & save cardio</Btn>
        </div>
      </Card>

      {recent.length > 0 && (
        <Card title="Recent cardio">
          {recent.map((c, i) => (
            <div key={i} style={{ ...row, padding: "8px 0", borderBottom: i < recent.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ color: C.ink, fontSize: 14 }}>{c.type}</span>
              <span style={{ color: C.dim, fontSize: 13 }}>{c.minutes}m · {fmtDate(c.date)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// Form-demo modal: opens a YouTube search in a new tab (links never break,
// unlike embeds which uploaders frequently disable).
function VideoModal({ name, onClose }) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " proper form technique")}`;
  useEffect(() => {
    window.open(url, "_blank", "noopener");
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ============================== BODY ==============================
function Body({ body, setBody, photos, setPhotos, settings }) {
  const unit = settings.unit;
  const mUnit = unit === "kg" ? "cm" : "in";
  const [date, setDate] = useState(todayStr());
  const sites = settings.sex === "female" ? SKINFOLDS_F : SKINFOLDS_M;

  const [form, setForm] = useState({ weight: "", sleep: "", stretch: "", time: "", girths: {}, skinfolds: {}, vitals: {} });
  const draftReady = React.useRef(false);
  const DRAFT_K = "draft:body";

  // Load saved record OR an unsaved draft when the date changes.
  useEffect(() => {
    draftReady.current = false;
    let cancelled = false;
    const saved = body.find((b) => b.date === date);
    Promise.resolve(loadKey(DRAFT_K, null)).then((draft) => {
      if (cancelled) return;
      if (!saved && draft && draft.date === date) {
        // restore in-progress, unsaved edits for this date
        const { date: _d, ...f } = draft;
        setForm({ weight: "", sleep: "", stretch: "", time: "", girths: {}, skinfolds: {}, vitals: {}, ...f });
      } else {
        const c = saved || {};
        setForm({ weight: c.weight ?? "", sleep: c.sleep ?? "", stretch: c.stretch ?? "", time: c.time ?? "", girths: c.girths ?? {}, skinfolds: c.skinfolds ?? {}, vitals: c.vitals ?? {} });
      }
      setTimeout(() => { draftReady.current = true; }, 0);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, body]);

  const bodyHasContent = (f) => f.weight || f.sleep || f.stretch || Object.values(f.girths || {}).some(Boolean) || Object.values(f.skinfolds || {}).some(Boolean) || Object.values(f.vitals || {}).some(Boolean);

  // autosave unsaved edits
  useEffect(() => {
    if (!draftReady.current) return;
    if (bodyHasContent(form)) saveKey(DRAFT_K, { date, ...form });
  }, [form, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // flush on hide/close
  useEffect(() => {
    const flush = () => { try { if (bodyHasContent(form)) saveKey(DRAFT_K, { date, ...form }); } catch { /* ignore */ } };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [form, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const [saved, setSaved] = useState(false);
  const save = () => {
    const rec = { date, ...form, time: form.time || nowClock() };
    setBody([...body.filter((x) => x.date !== date), rec].sort((a, b) => a.date.localeCompare(b.date)));
    draftReady.current = false;
    Promise.resolve(saveKey(DRAFT_K, null));
    setTimeout(() => { draftReady.current = true; }, 0);
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  };

  // live calculations
  const weightKg = useMemo(() => {
    const w = parseFloat(form.weight);
    if (!w) return null;
    return unit === "kg" ? w : w / 2.2046226;
  }, [form.weight, unit]);
  const sfSum = useMemo(() => sites.reduce((a, s) => a + (parseFloat(form.skinfolds[s]) || 0), 0), [form.skinfolds, sites]);
  const bf = useMemo(() => bodyFatJP3(sfSum, +settings.age, settings.sex), [sfSum, settings.age, settings.sex]);
  const bmiVal = useMemo(() => bmi(weightKg, +settings.heightCm), [weightKg, settings.heightCm]);
  const bmrVal = useMemo(() => bmr(weightKg, +settings.heightCm, +settings.age, settings.sex), [weightKg, settings.age, settings.heightCm, settings.sex]);
  const lean = useMemo(() => leanMass(weightKg, bf), [weightKg, bf]);

  const addPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // compress via canvas to keep storage small
      const img = new Image();
      img.onload = () => {
        const max = 720;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = img.width * scale; cv.height = img.height * scale;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const dataUrl = cv.toDataURL("image/jpeg", 0.7);
        setPhotos([...photos, { date, dataUrl, note: "" }].sort((a, b) => a.date.localeCompare(b.date)));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div>
      <div style={{ ...row, marginBottom: 12, gap: 8 }}>
        <span style={{ color: C.dim, fontSize: 13 }}>Date & time</span>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={dateInput} />
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={dateInput} />
        </div>
      </div>

      <Card title="Daily">
        <Field label={`Bodyweight`} value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} suffix={unit} inputMode="decimal" />
        <Field label="Sleep" value={form.sleep} onChange={(v) => setForm({ ...form, sleep: v })} suffix="h" inputMode="decimal" />
        <Field label="Stretching" value={form.stretch} onChange={(v) => setForm({ ...form, stretch: v })} suffix="min" inputMode="numeric" />
      </Card>

      <Card title="Watch metrics">
        <div style={{ color: C.faint, fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
          Glance at your Samsung watch and type the readings in. (A web app can't pull these automatically — this keeps them in one place alongside everything else.)
        </div>
        {(() => {
          const setV = (k, v) => setForm({ ...form, vitals: { ...form.vitals, [k]: v } });
          const V = form.vitals || {};
          return (
            <>
              <Field label="Steps" value={V.steps ?? ""} onChange={(v) => setV("steps", v)} inputMode="numeric" />
              <Field label="Resting HR" value={V.restingHR ?? ""} onChange={(v) => setV("restingHR", v)} suffix="bpm" inputMode="numeric" />
              <Field label="Blood oxygen" value={V.spo2 ?? ""} onChange={(v) => setV("spo2", v)} suffix="%" inputMode="numeric" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
                <span style={{ color: C.ink, fontSize: 14 }}>Blood pressure</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input inputMode="numeric" placeholder="sys" value={V.bpSys ?? ""} onChange={(e) => setV("bpSys", e.target.value)}
                    style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "9px 11px", fontSize: 14, width: 56, textAlign: "center" }} />
                  <span style={{ color: C.faint }}>/</span>
                  <input inputMode="numeric" placeholder="dia" value={V.bpDia ?? ""} onChange={(e) => setV("bpDia", e.target.value)}
                    style={{ background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "9px 11px", fontSize: 14, width: 56, textAlign: "center" }} />
                  <span style={{ color: C.faint, fontSize: 12, width: 30 }}>mmHg</span>
                </span>
              </div>
              <Field label="ECG note" value={V.ecg ?? ""} onChange={(v) => setV("ecg", v)} placeholder="e.g. sinus" />
            </>
          );
        })()}
      </Card>

      {(bmiVal || bf != null || bmrVal) && (
        <Card title="Calculated">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {bmiVal && <MiniStat label="BMI" value={bmiVal} sub={bmiClass(bmiVal)} />}
            {bf != null && <MiniStat label="Body fat" value={`${bf}%`} sub="JP 3-site" />}
            {lean && <MiniStat label="Lean mass" value={`${lean}${unit}`} sub="est." />}
            {bmrVal && <MiniStat label="BMR" value={bmrVal} sub="kcal/day" />}
          </div>
          <div style={{ color: C.faint, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
            Body fat uses Jackson-Pollock 3-site ({sites.join(", ")}) with your age & sex from Settings. Estimates, not clinical readings.
          </div>
        </Card>
      )}

      <Card title={`Circumferences · ${mUnit}`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {GIRTHS.map((g) => (
            <label key={g} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.dim, fontSize: 12 }}>{g}</span>
              <input inputMode="decimal" value={form.girths[g] ?? ""} onChange={(e) => setForm({ ...form, girths: { ...form.girths, [g]: e.target.value } })} style={setInput} />
            </label>
          ))}
        </div>
      </Card>

      <Card title="Skinfolds · mm">
        <div style={{ color: C.faint, fontSize: 11, marginBottom: 10 }}>
          Pinch with a caliper. Sum drives the body-fat estimate above.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {["Chest", "Abdomen (vertical)", "Abdomen (diagonal)", "Below navel", "Thigh", "Triceps", "Suprailiac"].map((s) => (
            <label key={s} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: C.dim, fontSize: 12 }}>{s}</span>
              <input inputMode="decimal" value={form.skinfolds[s] ?? ""} onChange={(e) => setForm({ ...form, skinfolds: { ...form.skinfolds, [s]: e.target.value } })} style={setInput} />
            </label>
          ))}
        </div>
      </Card>

      <Card title="Progress photo">
        <label style={{ ...photoAdd }}>
          + Add photo for {fmtDate(date)}
          <input type="file" accept="image/*" onChange={addPhoto} style={{ display: "none" }} />
        </label>
        {photos.filter((p) => p.date === date).map((p, i) => (
          <img key={i} src={p.dataUrl} alt="" style={{ width: "100%", borderRadius: 12, marginTop: 10 }} />
        ))}
        <div style={{ color: C.faint, fontSize: 11, marginTop: 8 }}>Stored privately on this device. Compare them over time in Progress.</div>
      </Card>

      <Btn variant="solid" onClick={save}>{saved ? "Saved ✓" : "Save day"}</Btn>
    </div>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ color: C.dim, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: C.gold, margin: "3px 0 1px" }}>{value}</div>
      <div style={{ color: C.faint, fontSize: 10 }}>{sub}</div>
    </div>
  );
}

// ============================== FOOD ==============================
function Food({ foods, setFoods, settings }) {
  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState("");
  const [manual, setManual] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  // autosave the half-typed manual food entry
  const clearManualDraft = useFormDraft("foodManual", manual, setManual, (m) => m && (m.name || m.kcal));

  const dayFoods = useMemo(() => foods.filter((f) => f.date === date), [foods, date]);
  const totals = useMemo(() => dayFoods.reduce((a, f) => ({
    kcal: a.kcal + (+f.kcal || 0), protein: a.protein + (+f.protein || 0),
    carbs: a.carbs + (+f.carbs || 0), fat: a.fat + (+f.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [dayFoods]);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true); setErr(""); setResults([]);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments`;
      const res = await fetch(url);
      const data = await res.json();
      const items = (data.products || [])
        .filter((p) => p.product_name && p.nutriments)
        .map((p) => ({
          name: [p.product_name, p.brands].filter(Boolean).join(" · ").slice(0, 60),
          kcal: Math.round(p.nutriments["energy-kcal_100g"] || p.nutriments["energy-kcal"] || 0),
          protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
        }))
        .filter((p) => p.kcal > 0);
      if (!items.length) setErr("No matches with nutrition data. Try a simpler term, or add it manually below.");
      setResults(items);
    } catch {
      setErr("Search needs an internet connection. You can still add foods manually below.");
    } finally {
      setSearching(false);
    }
  };

  const add = (item, qty = 100) => {
    const factor = qty / 100;
    setFoods([...foods, {
      date, time: nowClock(), name: item.name, qty,
      kcal: Math.round(item.kcal * factor), protein: Math.round(item.protein * factor * 10) / 10,
      carbs: Math.round(item.carbs * factor * 10) / 10, fat: Math.round(item.fat * factor * 10) / 10,
    }]);
  };
  const addManual = () => {
    if (!manual.name || !manual.kcal) return;
    setFoods([...foods, { date, time: nowClock(), ...manual, kcal: +manual.kcal, protein: +manual.protein || 0, carbs: +manual.carbs || 0, fat: +manual.fat || 0, qty: 1 }]);
    clearManualDraft();
    setManual({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  };
  const remove = (idx) => {
    const target = dayFoods[idx];
    setFoods(foods.filter((f) => f !== target));
  };

  const pct = Math.min(100, Math.round((totals.kcal / settings.calorieTarget) * 100));

  return (
    <div>
      <div style={{ ...row, marginBottom: 12 }}>
        <span style={{ color: C.dim, fontSize: 13 }}>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={dateInput} />
      </div>

      <Card title="Today's intake">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
          <div style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 600, color: C.gold }}>
            {totals.kcal}<span style={{ fontSize: 14, color: C.dim, fontFamily: FONT.body }}> / {settings.calorieTarget} kcal</span>
          </div>
        </div>
        <div style={{ height: 8, background: C.surface2, borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: C.gold, transition: "width .3s" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["Protein", totals.protein, "g"], ["Carbs", totals.carbs, "g"], ["Fat", totals.fat, "g"]].map(([l, v, u]) => (
            <div key={l} style={{ flex: 1, textAlign: "center", background: C.surface2, borderRadius: 12, padding: "10px 0" }}>
              <div style={{ fontFamily: FONT.display, fontSize: 18, color: C.ink }}>{Math.round(v)}{u}</div>
              <div style={{ color: C.faint, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Search food">
        <div style={{ display: "flex", gap: 8 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. greek yogurt"
            onKeyDown={(e) => e.key === "Enter" && search()}
            style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 12, padding: "12px 13px", fontSize: 14 }} />
          <button onClick={search} style={{ ...timerBtn, width: "auto", padding: "0 18px" }}>{searching ? "…" : "Find"}</button>
        </div>
        {err && <div style={{ color: C.rose, fontSize: 12, marginTop: 10 }}>{err}</div>}
        {results.map((r, i) => (
          <div key={i} style={{ ...row, padding: "10px 0", borderBottom: `1px solid ${C.line}`, gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.ink, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
              <div style={{ color: C.faint, fontSize: 11 }}>{r.kcal} kcal · P{r.protein} C{r.carbs} F{r.fat} / 100g</div>
            </div>
            <button onClick={() => add(r, 100)} style={addMini}>+100g</button>
          </div>
        ))}
        <div style={{ color: C.faint, fontSize: 11, marginTop: 10 }}>Values per 100g from Open Food Facts. Adds a 100g serving — adjust by logging twice or editing intake.</div>
      </Card>

      <Card title="Add manually">
        <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Food name"
          style={{ width: "100%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 12, padding: "11px 13px", fontSize: 14, marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[["kcal", "kcal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k, ph]) => (
            <input key={k} inputMode="numeric" value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} placeholder={ph}
              style={{ width: "25%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "10px 8px", fontSize: 13, textAlign: "center" }} />
          ))}
        </div>
        <div style={{ marginTop: 10 }}><Btn variant="quiet" onClick={addManual}>Add food</Btn></div>
      </Card>

      {dayFoods.length > 0 && (
        <Card title="Logged today">
          {dayFoods.map((f, i) => (
            <div key={i} style={{ ...row, padding: "9px 0", borderBottom: i < dayFoods.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.ink, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                <div style={{ color: C.faint, fontSize: 11 }}>{f.time ? `${f.time} · ` : ""}{f.kcal} kcal · P{f.protein}</div>
              </div>
              <button onClick={() => remove(i)} style={{ ...addMini, color: C.rose, borderColor: C.line }}>✕</button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ============================== PROGRESS ==============================
function Progress({ workouts, body, photos, settings }) {
  const unit = settings.unit;
  const mUnit = unit === "kg" ? "cm" : "in";

  const exercises = useMemo(() => {
    const counts = {};
    workouts.forEach((w) => w.lifts.forEach((l) => {
      if (l.sets.some((s) => parseFloat(s.w) && parseInt(s.r))) counts[l.name] = (counts[l.name] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [workouts]);

  const [exercise, setExercise] = useState("");
  useEffect(() => { if (!exercise && exercises.length) setExercise(exercises[0]); }, [exercises, exercise]);

  const exData = useMemo(() => {
    if (!exercise) return [];
    const rows = [];
    [...workouts].sort((a, b) => a.date.localeCompare(b.date)).forEach((w) => {
      let best = null, top = 0;
      w.lifts.filter((l) => l.name === exercise).forEach((l) => l.sets.forEach((s) => {
        const wt = parseFloat(s.w), r = parseInt(s.r);
        if (!wt || !r) return;
        const sc = e1rm(wt, r);
        if (!best || sc > best) best = sc;
        if (wt > top) top = wt;
      }));
      if (best) rows.push({ date: fmtDate(w.date), e1RM: best, top });
    });
    return rows;
  }, [workouts, exercise]);

  const record = useMemo(() => (exercise ? bestFor(workouts, exercise) : null), [workouts, exercise]);

  const [measure, setMeasure] = useState("Waist");
  const mData = useMemo(() => body
    .filter((b) => b.girths && b.girths[measure])
    .map((b) => ({ date: fmtDate(b.date), v: parseFloat(b.girths[measure]) }))
    .filter((p) => !isNaN(p.v)), [body, measure]);

  const bfData = useMemo(() => {
    const sites = settings.sex === "female" ? SKINFOLDS_F : SKINFOLDS_M;
    return body.map((b) => {
      const sum = sites.reduce((a, s) => a + (parseFloat(b.skinfolds?.[s]) || 0), 0);
      const bf = bodyFatJP3(sum, +settings.age, settings.sex);
      return bf != null ? { date: fmtDate(b.date), v: bf } : null;
    }).filter(Boolean);
  }, [body, settings]);

  const photoList = [...photos].sort((a, b) => a.date.localeCompare(b.date));

  // time-of-day analytics
  const todStats = useMemo(() => timeOfDayStats(workouts), [workouts]);
  const todData = useMemo(() => todStats.map((t) => ({
    label: hourLabel(t.hour), avgVol: t.avgVol, count: t.count, part: dayPart(t.hour),
  })), [todStats]);
  const totalTimed = useMemo(() => workouts.filter((w) => w.startMs).length, [workouts]);
  const bestWindow = useMemo(() => {
    if (todStats.length === 0) return null;
    return [...todStats].sort((a, b) => b.avgVol - a.avgVol)[0];
  }, [todStats]);

  // session-duration trend
  const durData = useMemo(() => [...workouts]
    .filter((w) => w.startMs && w.endMs)
    .sort((a, b) => a.startMs - b.startMs)
    .map((w) => ({ date: fmtDate(w.date), v: Math.round((w.endMs - w.startMs) / 60000) })), [workouts]);

  // rest-gap trend: avg seconds between sets and between exercises, per session
  const restData = useMemo(() => [...workouts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => {
      const g = restGaps(w);
      return (g.betweenSets != null || g.betweenExercises != null)
        ? { date: fmtDate(w.date), sets: g.betweenSets, lifts: g.betweenExercises }
        : null;
    })
    .filter(Boolean), [workouts]);

  const restAvg = useMemo(() => {
    const s = restData.map((r) => r.sets).filter((x) => x != null);
    const l = restData.map((r) => r.lifts).filter((x) => x != null);
    return {
      sets: s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null,
      lifts: l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null,
    };
  }, [restData]);

  if (!exercises.length && !mData.length && !photoList.length) {
    return <Empty>Log workouts, measurements, or photos and your progress will appear here.</Empty>;
  }

  return (
    <div>
      {exercises.length > 0 && (
        <Card title="Strength">
          <Select value={exercise} onChange={setExercise} style={{ marginBottom: 12 }}>
            {exercises.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
          {record && (
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <MiniStat label="Best set" value={`${record.w}×${record.r}`} sub={fmtDate(record.date)} />
              <MiniStat label="Est. 1RM" value={`${record.e1rm}${unit}`} sub="Epley" />
            </div>
          )}
          {exData.length > 1 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={exData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} />
                <YAxis tick={{ fill: C.faint, fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={chartTip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="e1RM" stroke={C.gold} strokeWidth={2.5} dot={{ r: 2.5 }} name={`1RM (${unit})`} />
                <Line type="monotone" dataKey="top" stroke={C.sage} strokeWidth={2} dot={{ r: 2.5 }} name={`top (${unit})`} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty>Log this lift twice to see the trend.</Empty>}
        </Card>
      )}

      {bfData.length > 1 && (
        <Card title="Body fat %">
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={bfData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} />
              <YAxis tick={{ fill: C.faint, fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={chartTip} />
              <Line type="monotone" dataKey="v" stroke={C.rose} strokeWidth={2.5} dot={{ r: 2.5 }} name="BF%" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title={`Measurement · ${mUnit}`}>
        <Select value={measure} onChange={setMeasure} style={{ marginBottom: 12 }}>
          {GIRTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        {mData.length > 1 ? (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={mData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} />
              <YAxis tick={{ fill: C.faint, fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={chartTip} />
              <Line type="monotone" dataKey="v" stroke={C.gold} strokeWidth={2.5} dot={{ r: 2.5 }} name={mUnit} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty>Log this measurement on two days to see its trend.</Empty>}
      </Card>

      {durData.length > 1 && (
        <Card title="Session duration">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={durData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} />
              <YAxis tick={{ fill: C.faint, fontSize: 11 }} />
              <Tooltip contentStyle={chartTip} />
              <Bar dataKey="v" fill={C.sage} radius={[5, 5, 0, 0]} name="minutes" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ color: C.faint, fontSize: 11, marginTop: 6 }}>Minutes per session, from live-logged workouts.</div>
        </Card>
      )}

      {(restAvg.sets != null || restAvg.lifts != null) && (
        <Card title="Rest between efforts">
          <div style={{ display: "flex", gap: 10, marginBottom: restData.length > 1 ? 12 : 0 }}>
            {restAvg.sets != null && <MiniStat label="Avg between sets" value={`${restAvg.sets}s`} sub="within an exercise" />}
            {restAvg.lifts != null && <MiniStat label="Avg between lifts" value={`${restAvg.lifts}s`} sub="exercise transitions" />}
          </div>
          {restData.length > 1 && (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={restData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} />
                <YAxis tick={{ fill: C.faint, fontSize: 11 }} />
                <Tooltip contentStyle={chartTip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={settings.rest} stroke={C.rose} strokeDasharray="4 4"
                  label={{ value: `target ${settings.rest}s`, fill: C.rose, fontSize: 10, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="sets" stroke={C.gold} strokeWidth={2.5} dot={{ r: 2.5 }} name="between sets (s)" connectNulls />
                <Line type="monotone" dataKey="lifts" stroke={C.sage} strokeWidth={2} dot={{ r: 2.5 }} name="between lifts (s)" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div style={{ color: C.faint, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            Measured as the gap between when you log each set. Shorter rest generally means higher density and effort; longer rest favours heavier strength work. Use it to keep your rest consistent with your goal.
          </div>
        </Card>
      )}

      {todData.length > 0 && (
        <Card title="When you train best">
          {bestWindow && (
            <div style={{ marginBottom: 12 }}>
              <MiniStat label="Strongest window" value={`${hourLabel(bestWindow.hour)} · ${dayPart(bestWindow.hour)}`} sub={`avg ${bestWindow.avgVol} volume`} />
            </div>
          )}
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={todData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.faint, fontSize: 11 }} />
              <YAxis tick={{ fill: C.faint, fontSize: 11 }} />
              <Tooltip contentStyle={chartTip} />
              <Bar dataKey="avgVol" fill={C.gold} radius={[5, 5, 0, 0]} name="avg volume" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ color: C.faint, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            {totalTimed < 8
              ? `Based on ${totalTimed} timed session${totalTimed === 1 ? "" : "s"} — early signal, will sharpen as you log more.`
              : `Average training volume by hour of day, across ${totalTimed} timed sessions.`}
          </div>
        </Card>
      )}

      {photoList.length > 0 && (
        <Card title="Photo timeline">
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {photoList.map((p, i) => (
              <div key={i} style={{ flexShrink: 0, width: 130 }}>
                <img src={p.dataUrl} alt="" style={{ width: 130, height: 170, objectFit: "cover", borderRadius: 12, border: `1px solid ${C.line}` }} />
                <div style={{ color: C.faint, fontSize: 11, textAlign: "center", marginTop: 4 }}>{fmtDate(p.date)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================== PLAN ==============================
function Plan({ plan, setPlan, checks, setChecks, settings, setSettings }) {
  const today = todayStr();
  const todayChecks = checks[today] || {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan.protocol);

  const toggle = (item) => {
    const day = { ...(checks[today] || {}) };
    day[item] = !day[item];
    setChecks({ ...checks, [today]: day });
  };

  const doneCount = plan.checklist.filter((i) => todayChecks[i]).length;
  const pct = plan.checklist.length ? Math.round((doneCount / plan.checklist.length) * 100) : 0;

  // adherence streak: consecutive days (ending today or yesterday) with 100% done
  const streak = useMemo(() => {
    let s = 0;
    for (let d = 0; d < 60; d++) {
      const date = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
      const c = checks[date];
      const all = c && plan.checklist.length && plan.checklist.every((i) => c[i]);
      if (all) s++;
      else if (d === 0) continue; // today not finished yet — don't break streak
      else break;
    }
    return s;
  }, [checks, plan.checklist]);

  // last 7 days adherence %
  const week = useMemo(() => {
    let total = 0, hit = 0;
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
      const c = checks[date] || {};
      plan.checklist.forEach((i) => { total++; if (c[i]) hit++; });
    }
    return total ? Math.round((hit / total) * 100) : 0;
  }, [checks, plan.checklist]);

  // checklist editing
  const [newItem, setNewItem] = useState("");
  const addItem = () => { if (newItem.trim()) { setPlan({ ...plan, checklist: [...plan.checklist, newItem.trim()] }); setNewItem(""); } };
  const removeItem = (item) => setPlan({ ...plan, checklist: plan.checklist.filter((i) => i !== item) });

  const goals = [["muscle", "Build muscle"], ["cut", "Cut / lose fat"], ["longevity", "Longevity"], ["maintain", "Maintain"]];

  return (
    <div>
      <Card title="Goal">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {goals.map(([id, label]) => (
            <Pill key={id} active={settings.goal === id} onClick={() => setSettings({ ...settings, goal: id })}>{label}</Pill>
          ))}
        </div>
        <div style={{ color: C.faint, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
          Your goal shapes the Coach advice on Home — gaining pace and volume for muscle, deficit pace for cutting, vitals and cardio for longevity.
        </div>
      </Card>

      <Card title="Today's adherence"
        action={<span style={{ fontSize: 13, color: pct === 100 ? C.sage : C.gold, fontWeight: 700 }}>{doneCount}/{plan.checklist.length}</span>}>
        <div style={{ height: 8, background: C.surface2, borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.sage : C.gold, transition: "width .3s" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plan.checklist.map((item) => {
            const on = !!todayChecks[item];
            return (
              <button key={item} onClick={() => toggle(item)} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 11, cursor: "pointer",
                background: on ? C.sageSoft : C.surface2, border: `1px solid ${on ? C.sage : C.line}`, textAlign: "left", fontFamily: FONT.body,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: `2px solid ${on ? C.sage : C.faint}`,
                  background: on ? C.sage : "transparent", color: C.black, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800,
                }}>{on ? "✓" : ""}</span>
                <span style={{ color: on ? C.ink : C.dim, fontSize: 14, textDecoration: on ? "none" : "none" }}>{item}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <MiniStat label="Streak" value={`${streak}d`} sub="all items done" />
          <MiniStat label="7-day" value={`${week}%`} sub="adherence" />
        </div>
        {pct === 100 && (
          <div style={{ marginTop: 12, background: C.sageSoft, border: `1px solid ${C.sage}`, borderRadius: 12, padding: "11px 13px", color: C.ink, fontSize: 13 }}>
            🎯 Everything done today. {streak >= 2 ? `${streak}-day streak — consistency is what builds the physique.` : "Lock in tomorrow to start a streak."}
          </div>
        )}
      </Card>

      <Card title="Checklist items">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {plan.checklist.map((item) => (
            <div key={item} style={{ ...row, padding: "6px 0" }}>
              <span style={{ color: C.dim, fontSize: 13 }}>{item}</span>
              <button onClick={() => removeItem(item)} style={{ ...addMini, color: C.rose, borderColor: C.line }}>Remove</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a daily habit"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "11px 12px", fontSize: 14 }} />
          <button onClick={addItem} style={{ ...timerBtn, width: "auto", padding: "0 18px" }}>Add</button>
        </div>
      </Card>

      <Card title="My protocol"
        action={<button onClick={() => { if (editing) { setPlan({ ...plan, protocol: draft }); } setEditing(!editing); }}
          style={{ ...addMini }}>{editing ? "Save" : "Edit"}</button>}>
        {editing ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={16}
            style={{ width: "100%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 12, padding: "12px", fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: FONT.body }} />
        ) : (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: C.dim, fontSize: 13, lineHeight: 1.7, fontFamily: FONT.body }}>{plan.protocol}</pre>
        )}
      </Card>
    </div>
  );
}

// ============================== MORE ==============================
function More(props) {
  const [section, setSection] = useState("settings");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["settings", "Settings"], ["program", "Program"], ["data", "Data"], ["history", "History"]].map(([id, l]) => (
          <Pill key={id} active={section === id} onClick={() => setSection(id)}>{l}</Pill>
        ))}
      </div>
      {section === "settings" && <Settings settings={props.settings} setSettings={props.setSettings} />}
      {section === "program" && <ProgramEditor program={props.program} setProgram={props.setProgram} />}
      {section === "data" && <DataPanel {...props} />}
      {section === "history" && <History {...props} />}
    </div>
  );
}

function Settings({ settings, setSettings }) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  return (
    <div>
      <Card title="About you">
        <div style={{ ...row, padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ color: C.ink, fontSize: 14 }}>Sex (for formulas)</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["male", "female"].map((s) => <Pill key={s} active={settings.sex === s} onClick={() => set("sex", s)}>{s}</Pill>)}
          </div>
        </div>
        <Field label="Age" value={settings.age} onChange={(v) => set("age", v)} suffix="yr" inputMode="numeric" />
        <Field label="Height" value={settings.heightCm} onChange={(v) => set("heightCm", v)} suffix="cm" inputMode="numeric" />
      </Card>

      <Card title="Units & timer">
        <div style={{ ...row, padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ color: C.ink, fontSize: 14 }}>Weight unit</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["kg", "lb"].map((u) => <Pill key={u} active={settings.unit === u} onClick={() => set("unit", u)}>{u}</Pill>)}
          </div>
        </div>
        <Field label="Rest timer" value={settings.rest} onChange={(v) => set("rest", parseInt(v) || 0)} suffix="s" inputMode="numeric" />
      </Card>

      <Card title="Targets">
        <Field label="Calories" value={settings.calorieTarget} onChange={(v) => set("calorieTarget", parseInt(v) || 0)} suffix="kcal" inputMode="numeric" />
        <Field label="Protein" value={settings.proteinTarget} onChange={(v) => set("proteinTarget", parseInt(v) || 0)} suffix="g" inputMode="numeric" />
        <Field label="Sleep" value={settings.sleepTarget} onChange={(v) => set("sleepTarget", parseFloat(v) || 0)} suffix="h" inputMode="decimal" />
        <Field label="Cardio / wk" value={settings.cardioTarget} onChange={(v) => set("cardioTarget", parseInt(v) || 0)} suffix="m" inputMode="numeric" />
      </Card>

      <Card title="Deload">
        <div style={{ color: C.dim, fontSize: 13, marginBottom: 10 }}>Last: {settings.lastDeload ? fmtDate(settings.lastDeload) : "—"}. Banner appears after 6 weeks.</div>
        <Btn variant="quiet" onClick={() => set("lastDeload", todayStr())}>Mark deload done today</Btn>
      </Card>
    </div>
  );
}

function ProgramEditor({ program, setProgram }) {
  const [day, setDay] = useState("Push");
  const slots = program[day] || [];

  const update = (i, field, value) => {
    const next = { ...program, [day]: slots.map((s, idx) => idx !== i ? s : { ...s, [field]: value }) };
    setProgram(next);
  };
  const updateOptions = (i, text) => update(i, "options", text.split(",").map((s) => s.trim()).filter(Boolean));
  const addSlot = () => setProgram({ ...program, [day]: [...slots, { slot: "New slot", sets: 3, reps: "8–12", options: ["New exercise"] }] });
  const removeSlot = (i) => setProgram({ ...program, [day]: slots.filter((_, idx) => idx !== i) });
  const reset = () => setProgram(DEFAULT_PROGRAM);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {DAY_ORDER.map((d) => <Pill key={d} active={day === d} onClick={() => setDay(d)} style={{ flex: 1, textAlign: "center" }}>{d}</Pill>)}
      </div>
      {slots.map((s, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <input value={s.slot} onChange={(e) => update(i, "slot", e.target.value)} placeholder="Slot name"
            style={{ width: "100%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 600, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={s.sets} onChange={(e) => update(i, "sets", parseInt(e.target.value) || 1)} inputMode="numeric"
              style={{ width: "50%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13 }} placeholder="sets" />
            <input value={s.reps} onChange={(e) => update(i, "reps", e.target.value)}
              style={{ width: "50%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13 }} placeholder="reps e.g. 8–12" />
          </div>
          <textarea value={s.options.join(", ")} onChange={(e) => updateOptions(i, e.target.value)} rows={2}
            style={{ width: "100%", background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13, resize: "vertical" }}
            placeholder="Variations, comma-separated" />
          <button onClick={() => removeSlot(i)} style={{ ...addMini, color: C.rose, marginTop: 8 }}>Remove slot</button>
        </Card>
      ))}
      <Btn variant="quiet" onClick={addSlot} style={{ marginBottom: 10 }}>+ Add slot to {day}</Btn>
      <Btn variant="danger" onClick={reset}>Reset program to default</Btn>
    </div>
  );
}

function DataPanel({ workouts, setWorkouts, cardio, setCardio, body, setBody, foods, setFoods, photos, setPhotos, program, setProgram, plan, setPlan, checks, setChecks, settings, setSettings }) {
  const [msg, setMsg] = useState("");
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const stamp = () => new Date().toISOString().slice(0, 10);

  const download = (filename, text, type) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    download(`atelier-backup-${stamp()}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), version: 3, workouts, cardio, body, foods, photos, program, settings, plan, checks }, null, 2),
      "application/json");
    flash("JSON backup downloaded.");
  };

  const exportCSV = () => {
    const w = [["date", "day", "slot", "exercise", "set", "weight", "reps"]];
    workouts.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((s) =>
      s.lifts.forEach((l) => l.sets.forEach((st, i) => w.push([s.date, s.day, l.slot || "", l.name, i + 1, st.w, st.r]))));
    download(`atelier-workouts-${stamp()}.csv`, toCSV(w), "text/csv");

    const b = [["date", "weight", "sleep", "stretch", "steps", "restingHR", "spo2", "bpSys", "bpDia", ...GIRTHS]];
    body.slice().sort((a, b2) => a.date.localeCompare(b2.date)).forEach((r) =>
      b.push([r.date, r.weight ?? "", r.sleep ?? "", r.stretch ?? "",
        r.vitals?.steps ?? "", r.vitals?.restingHR ?? "", r.vitals?.spo2 ?? "", r.vitals?.bpSys ?? "", r.vitals?.bpDia ?? "",
        ...GIRTHS.map((g) => r.girths?.[g] || "")]));
    download(`atelier-body-${stamp()}.csv`, toCSV(b), "text/csv");
    flash("CSV files downloaded.");
  };

  const importJSON = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (d.workouts) setWorkouts(d.workouts);
        if (d.cardio) setCardio(d.cardio);
        if (d.body) setBody(d.body);
        if (d.foods) setFoods(d.foods);
        if (d.photos) setPhotos(d.photos);
        if (d.program) setProgram(d.program);
        if (d.plan) setPlan(d.plan);
        if (d.checks) setChecks(d.checks);
        if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings });
        flash("Backup restored.");
      } catch { flash("Couldn't read that file. Use an Atelier JSON backup."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <Card title="Export">
        <p style={{ color: C.dim, fontSize: 13, margin: "0 0 12px", lineHeight: 1.6 }}>JSON is a full backup you can re-import. CSV opens in Excel or Sheets.</p>
        <Btn variant="solid" onClick={exportJSON} style={{ marginBottom: 8 }}>Export JSON backup</Btn>
        <Btn variant="quiet" onClick={exportCSV}>Export CSV</Btn>
      </Card>
      <Card title="Restore">
        <p style={{ color: C.dim, fontSize: 13, margin: "0 0 12px", lineHeight: 1.6 }}>Importing replaces current data — export first if unsure.</p>
        <label style={{ ...photoAdd }}>
          Choose JSON file…
          <input type="file" accept="application/json" onChange={importJSON} style={{ display: "none" }} />
        </label>
      </Card>
      <Card title="Summary">
        <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.8 }}>
          {workouts.length} strength · {cardio.length} cardio · {body.length} body · {foods.length} food · {photos.length} photos
        </div>
      </Card>
      {msg && <div style={toast}>{msg}</div>}
    </div>
  );
}

function toCSV(rows) {
  return rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}

function History({ workouts, setWorkouts, cardio, setCardio, body, setBody }) {
  const items = useMemo(() => {
    const w = workouts.map((x) => ({ type: "w", date: x.date, data: x }));
    const c = cardio.map((x) => ({ type: "c", date: x.date, data: x }));
    const b = body.filter((x) => x.weight || x.sleep || x.stretch || Object.keys(x.girths || {}).length || Object.keys(x.skinfolds || {}).length)
      .map((x) => ({ type: "b", date: x.date, data: x }));
    return [...w, ...c, ...b].sort((a, b2) => b2.date.localeCompare(a.date));
  }, [workouts, cardio, body]);

  if (!items.length) return <Empty>No history yet.</Empty>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it, i) => (
        <Card key={i} style={{ marginBottom: 0 }}>
          <div style={{ ...row }}>
            <strong style={{ fontSize: 14, color: C.ink }}>
              {fmtDate(it.date)} · {it.type === "w" ? `${it.data.day} session` : it.type === "c" ? `${it.data.type} cardio` : "Body log"}
            </strong>
            <button onClick={() => {
              if (it.type === "w") setWorkouts((w) => w.filter((x) => !(x.date === it.date && x.day === it.data.day)));
              else if (it.type === "c") setCardio((c) => c.filter((x) => x !== it.data));
              else setBody((b) => b.filter((x) => x.date !== it.date));
            }} style={{ ...addMini, color: C.rose }}>Delete</button>
          </div>
          {it.type === "w" && (
            <div style={{ marginTop: 8, color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
              {(it.data.startMs || it.data.endMs) && (
                <div style={{ color: C.faint, fontSize: 11, marginBottom: 4 }}>
                  {it.data.startMs ? fmtClock(it.data.startMs) : ""}
                  {it.data.startMs && it.data.endMs ? ` · ${fmtDur(it.data.endMs - it.data.startMs)}` : ""}
                  {(() => { const g = restGaps(it.data); return g.betweenSets != null ? ` · rest ~${g.betweenSets}s/set` : ""; })()}
                  {(() => { const g = restGaps(it.data); return g.betweenExercises != null ? ` · ${g.betweenExercises}s between lifts` : ""; })()}
                </div>
              )}
              {it.data.lifts.map((l) => (
                <div key={l.name}>
                  <span style={{ color: C.ink }}>{l.name}:</span> {l.sets.map((s) => `${s.w || "–"}×${s.r || "–"}`).join("  ")}
                  {l.rpe && <span style={{ color: C.gold, fontSize: 11 }}> · RPE {l.rpe}</span>}
                  {l.note && <span style={{ color: C.faint, fontSize: 11, fontStyle: "italic" }}> · {l.note}</span>}
                </div>
              ))}
            </div>
          )}
          {it.type === "c" && <div style={{ marginTop: 6, color: C.dim, fontSize: 13 }}>{it.data.time ? `${it.data.time} · ` : ""}{it.data.minutes} min · zone {it.data.zone}</div>}
          {it.type === "b" && (
            <div style={{ marginTop: 6, color: C.dim, fontSize: 13 }}>
              {it.data.time && <span style={chip}>🕐 {it.data.time}</span>}
              {it.data.weight && <span style={chip}>⚖ {it.data.weight}</span>}
              {it.data.sleep && <span style={chip}>😴 {it.data.sleep}h</span>}
              {it.data.stretch && <span style={chip}>🧘 {it.data.stretch}m</span>}
              {it.data.vitals?.steps && <span style={chip}>👟 {it.data.vitals.steps}</span>}
              {it.data.vitals?.restingHR && <span style={chip}>❤️ {it.data.vitals.restingHR}</span>}
              {it.data.vitals?.spo2 && <span style={chip}>🫁 {it.data.vitals.spo2}%</span>}
              {it.data.vitals?.bpSys && it.data.vitals?.bpDia && <span style={chip}>🩸 {it.data.vitals.bpSys}/{it.data.vitals.bpDia}</span>}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------- styles ----------
const shell = {
  display: "flex", flexDirection: "column", height: "100vh", maxWidth: 480, margin: "0 auto",
  background: C.bg, color: C.ink, fontFamily: FONT.body,
};
const navBar = { display: "flex", gap: 4, padding: "8px 12px 12px", borderBottom: `1px solid ${C.line}`, overflowX: "auto" };
const navTab = (on) => ({
  flex: 1, padding: "9px 6px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
  background: on ? C.gold : "transparent", color: on ? C.black : C.dim, whiteSpace: "nowrap", fontFamily: FONT.body,
});
const heroCard = {
  position: "relative", overflow: "hidden", background: C.surface, border: `1px solid ${C.line}`,
  borderRadius: 20, padding: "20px 18px", marginBottom: 14,
};
const row = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const dateInput = { background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "9px 11px", fontSize: 14, fontFamily: FONT.body };
const setInput = { background: C.surface2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "10px", fontSize: 14, textAlign: "center", flex: 1, minWidth: 0, width: "100%" };
const timerBtn = { background: C.surface2, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body };
const demoBtn = { width: "100%", marginTop: 8, padding: "9px 0", borderRadius: 10, cursor: "pointer", background: "transparent", border: `1px solid ${C.line}`, color: C.dim, fontSize: 13, fontWeight: 500, fontFamily: FONT.body };
const addSetBtn = { width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 9, cursor: "pointer", background: "transparent", border: `1px dashed ${C.line}`, color: C.faint, fontSize: 12, fontFamily: FONT.body };
const addMini = { background: "transparent", border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body, whiteSpace: "nowrap" };
const restChip = { position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.gold, color: C.black, border: "none", borderRadius: 99, padding: "13px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", zIndex: 40, boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: FONT.body };
const photoAdd = { display: "block", textAlign: "center", cursor: "pointer", background: C.surface2, border: `1px dashed ${C.line}`, color: C.gold, borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 500 };
const chip = { display: "inline-block", background: C.surface2, borderRadius: 7, padding: "3px 9px", fontSize: 12, marginRight: 6, color: C.ink };
const toast = { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.gold, color: C.black, padding: "11px 20px", borderRadius: 11, fontWeight: 600, fontSize: 13, zIndex: 60, fontFamily: FONT.body };
const deload = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: C.sageSoft, border: `1px solid ${C.sage}`, color: C.ink, borderRadius: 14, padding: "13px 15px", fontSize: 14 };
const deloadBtn = { background: C.sage, color: C.black, border: "none", borderRadius: 9, padding: "8px 13px", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0, fontFamily: FONT.body };
