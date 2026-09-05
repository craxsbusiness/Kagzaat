import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-SHA-256 (FNV-1a blocks) — demo-grade digest    */
/* ------------------------------------------------------------------ */
function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export function pseudoSha256(input: string): string {
  let out = "";
  const seeds = [
    0x811c9dc5, 0x1000193, 0xdeadbeef, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f,
    0x165667b1, 0x9e3779b1, 0x2545f491, 0x6c62272e, 0x5f356495, 0x3c6ef372, 0x510e527f,
    0x1f83d9ab, 0x5be0cd19,
  ];
  for (let b = 0; b < 8; b++) {
    const h1 = fnv1a(input + "::" + b + "a", seeds[b * 2]);
    const h2 = fnv1a(input + "::" + b + "b", seeds[b * 2 + 1]);
    out += h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

export const GENESIS = "0".repeat(64);

export function shortHash(h: string, head = 10, tail = 8): string {
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

export function hashPassword(pw: string): string {
  return "argon2id$" + pseudoSha256("lexvault::" + pw + "::salt-v1");
}

/* secret answers are normalised (trim + lowercase) and salted separately */
export function hashSecret(s: string): string {
  return "argon2id$" + pseudoSha256("lexvault::secq::" + s.trim().toLowerCase() + "::salt-v2");
}

/* ------------------------------------------------------------------ */
/* Audit chain                                                         */
/* ------------------------------------------------------------------ */
export interface ChainLink {
  seq: number;
  ts: string;
  actor: string;
  role: string;
  action: string;
  caseId: string;
  docId: string;
  detail: string;
  ip: string;
  prevHash: string;
  hash: string;
}

export function linkHash(e: Omit<ChainLink, "hash">): string {
  return pseudoSha256(
    [e.seq, e.ts, e.actor, e.role, e.action, e.caseId, e.docId, e.detail, e.ip, e.prevHash].join("|")
  );
}

export function makeLink(
  prev: ChainLink | undefined,
  fields: { actor: string; role: string; action: string; caseId?: string; docId?: string; detail?: string; ip?: string }
): ChainLink {
  const base = {
    seq: prev ? prev.seq + 1 : 1,
    ts: new Date().toISOString(),
    actor: fields.actor,
    role: fields.role,
    action: fields.action,
    caseId: fields.caseId ?? "—",
    docId: fields.docId ?? "—",
    detail: fields.detail ?? "",
    ip: fields.ip ?? "127.0.0.1",
    prevHash: prev ? prev.hash : GENESIS,
  };
  return { ...base, hash: linkHash(base) };
}

export function verifyChain(chain: ChainLink[]): { ok: boolean; badSeq: number; verified: number } {
  const sorted = [...chain].sort((a, b) => a.seq - b.seq);
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (linkHash(e) !== e.hash) return { ok: false, badSeq: e.seq, verified: i };
    const expectedPrev = i === 0 ? GENESIS : sorted[i - 1].hash;
    if (e.prevHash !== expectedPrev) return { ok: false, badSeq: e.seq, verified: i };
  }
  return { ok: true, badSeq: -1, verified: sorted.length };
}

/* ------------------------------------------------------------------ */
/* Document version chain                                              */
/* ------------------------------------------------------------------ */
export function versionHash(docId: string, v: number, body: string, note: string, prevHash: string): string {
  return pseudoSha256([docId, v, body, note, prevHash].join("§"));
}

export function verifyDocVersions(
  docId: string,
  versions: { v: number; body: string; note: string; hash: string; prevHash: string }[]
): { ok: boolean; badV: number } {
  const sorted = [...versions].sort((a, b) => a.v - b.v);
  let prev = GENESIS;
  for (const ver of sorted) {
    if (ver.prevHash !== prev) return { ok: false, badV: ver.v };
    if (versionHash(docId, ver.v, ver.body, ver.note, prev) !== ver.hash) return { ok: false, badV: ver.v };
    prev = ver.hash;
  }
  return { ok: true, badV: -1 };
}

/* word-level diff for version comparison */
export interface DiffTok {
  type: "same" | "add" | "del";
  text: string;
}
export function diffWords(a: string, b: string): DiffTok[] {
  const A = a.split(/(\s+)/).filter((x) => x.length > 0);
  const B = b.split(/(\s+)/).filter((x) => x.length > 0);
  const n = A.length;
  const m = B.length;
  const cap = 1400;
  if (n * m > cap * cap) {
    return [
      { type: "del", text: a },
      { type: "add", text: b },
    ];
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffTok[] = [];
  const push = (type: DiffTok["type"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push("same", A[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", A[i]);
      i++;
    } else {
      push("add", B[j]);
      j++;
    }
  }
  while (i < n) {
    push("del", A[i]);
    i++;
  }
  while (j < m) {
    push("add", B[j]);
    j++;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${fmtDate(iso)} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds()
  ).padStart(2, "0")}`;
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

export function agoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

export function inDaysIso(days: number, h: number, m: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function deviceInfo(): string {
  const ua = navigator.userAgent;
  const browser = ua.includes("Edg") ? "Edge" : ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Browser";
  const os = ua.includes("Windows") ? "Windows" : ua.includes("Android") ? "Android" : ua.includes("iPhone") || ua.includes("iPad") ? "iOS" : ua.includes("Mac") ? "macOS" : ua.includes("Linux") ? "Linux" : "OS";
  return `${browser} / ${os}`;
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */
export function useLocalState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);
  return [state, setState];
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCountUp(target: number, durationMs = 700): number {
  const reduced = useReducedMotion();
  const [val, setVal] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduced]);
  return val;
}
