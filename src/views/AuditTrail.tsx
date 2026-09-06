import { useMemo, useRef, useState } from "react";
import type { ChainLink } from "../lib";
import { fmtDateTime, shortHash, timeAgo, useReducedMotion, verifyChain } from "../lib";
import type { LoginEvent, SecurityEvent, User } from "../data";
import { AUDIT_CATEGORIES, auditScope } from "../data";
import { Btn, Chip, Panel, SeverityBadge, useCopy } from "../ui";
import { useT } from "../i18n";
import { IcAlert, IcChain, IcCheck, IcClock, IcCopy, IcEye, IcKey, IcShield } from "../icons";

interface Props {
  user: User;
  audit: ChainLink[];
  logins: LoginEvent[];
  security: SecurityEvent[];
  onVerifyChain: () => void;
  onReviewSecurity: (id: string) => void;
}

const KIND_STYLE: Record<string, string> = {
  SUCCESS: "text-green", FAILED: "text-crimson", LOGOUT: "text-ink3", EXPIRED: "text-amber",
  MFA_OK: "text-green", MFA_FAIL: "text-crimson", TOKEN_ROTATED: "text-azure", LOCKOUT: "text-crimson",
};

export default function AuditTrail(p: Props) {
  const t = useT();
  const scope = auditScope(p.user);
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [verifiedUpTo, setVerifiedUpTo] = useState(0);
  const [result, setResult] = useState<null | { ok: boolean; verified: number; badSeq: number }>(null);
  const timers = useRef<number[]>([]);
  const reduced = useReducedMotion();
  const { copied, copy } = useCopy();

  const sorted = useMemo(() => [...p.audit].sort((a, b) => b.seq - b.seq), [p.audit]);
  const cats = useMemo(() => ["ALL", ...Array.from(new Set(Object.values(AUDIT_CATEGORIES)))], []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sorted
      .filter((a) => (cat === "ALL" ? true : (AUDIT_CATEGORIES[a.action] ?? "other") === cat))
      .filter((a) => (needle === "" ? true : [a.actor, a.action, a.caseId, a.docId, a.detail, a.ip].join(" ").toLowerCase().includes(needle)));
  }, [sorted, cat, q]);

  const head = sorted[0];

  const runVerify = () => {
    if (phase === "running") return;
    setPhase("running");
    setResult(null);
    setVerifiedUpTo(0);
    const r = verifyChain(p.audit);
    const total = p.audit.length;
    const target = r.ok ? total : total - 1;
    const step = reduced ? 8 : Math.max(24, Math.min(90, 1400 / Math.max(total, 1)));
    for (let i = 1; i <= target; i++) {
      timers.current.push(window.setTimeout(() => setVerifiedUpTo(i), step * i));
    }
    timers.current.push(
      window.setTimeout(() => {
        setPhase("done");
        setResult(r);
        p.onVerifyChain();
      }, step * (target + 1) + 120)
    );
  };

  const stateFor = (a: ChainLink): "ok" | "bad" | "pending" | "idle" => {
    if (phase === "idle") return "idle";
    const idxFromHead = sorted.indexOf(a);
    const verifiedCount = phase === "done" && result ? result.verified : verifiedUpTo;
    if (phase === "done" && result && !result.ok && a.seq === result.badSeq) return "bad";
    return sorted.length - idxFromHead <= verifiedCount ? "ok" : "pending";
  };

  return (
    <div className="space-y-4">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink3">{t("audit.kicker")}</p>
          <h1 className="font-display font-semibold uppercase text-[30px] leading-none tracking-wide text-ink mt-1">{t("audit.title")}</h1>
          <p className="font-mono text-[10.5px] uppercase tracking-widest text-ink3 mt-2">
            scope · {scope === "FULL" ? "full registry" : scope === "OWN_CASES" ? "assigned cases only" : "no audit access"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-ink2 border border-line bg-card px-2.5 py-1.5">chain height · {p.audit.length}</span>
          <Btn kind="navy" onClick={runVerify} disabled={phase === "running" || p.audit.length === 0}>
            <IcChain c="w-3.5 h-3.5" /> {phase === "running" ? `verifying ${verifiedUpTo}/${p.audit.length}` : t("audit.verifyChain")}
          </Btn>
        </div>
      </div>

      {phase === "done" && result && (
        <div className={`rise border px-4 py-3 flex flex-wrap items-center gap-3 ${result.ok ? "border-green/60 bg-green/5" : "border-crimson/60 bg-crimson/5"}`}>
          {result.ok ? <IcCheck c="w-5 h-5 text-green" /> : <IcAlert c="w-5 h-5 text-crimson" />}
          <p className="text-[13.5px] text-ink font-semibold">
            {result.ok ? `Chain intact — ${result.verified} links recomputed against their predecessors.` : `CHAIN BROKEN at #${result.badSeq} — tampering suspected. Escalated to security.`}
          </p>
          {head && (
            <button onClick={() => copy(head.hash, "head")} className="ml-auto font-mono text-[10.5px] text-steel hover:text-crimson transition-colors inline-flex items-center gap-1.5" title={head.hash}>
              head {shortHash(head.hash, 8, 6)} {copied === "head" ? <IcCheck c="w-3 h-3 text-green" /> : <IcCopy c="w-3 h-3" />}
            </button>
          )}
        </div>
      )}

      {/* filters */}
      <div className="rise flex flex-wrap items-center gap-2" style={{ animationDelay: "50ms" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="actor, action, case, document, IP…"
          className="flex-1 min-w-[200px] max-w-sm bg-card border border-line px-3 py-2 text-[13px] focus:outline-none focus:border-navy placeholder:text-ink3/70 transition-colors"
        />
        {cats.map((cc) => (
          <button
            key={cc}
            onClick={() => setCat(cc)}
            className={`font-mono text-[10.5px] uppercase tracking-[0.08em] px-3 py-2 rounded-full border transition-colors ${cat === cc ? "bg-navy text-paper border-navy" : "bg-card text-ink2 border-line hover:border-navy"}`}
          >
            {cc}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        {/* chain */}
        <div className="lg:col-span-3">
          <Panel title={`${t("audit.chain")} · ${filtered.length}`} delay={100} right={<IcShield c="w-4 h-4 text-ink3" />}>
            <ul className="divide-y divide-line/70 max-h-[640px] overflow-y-auto">
              {filtered.length === 0 && (
                <li className="px-4 py-14 text-center">
                  <span className="inline-flex w-12 h-12 border-2 border-navy/30 text-navy/50 items-center justify-center"><IcChain c="w-6 h-6" /></span>
                  <p className="font-display uppercase tracking-[0.18em] text-ink text-[15px] mt-4">
                    {p.audit.length === 0 ? t("audit.genesis") : "No events match this filter"}
                  </p>
                  <p className="text-[12.5px] text-ink2 mt-2 max-w-md mx-auto leading-relaxed">
                    {p.audit.length === 0 ? t("audit.genesisBody") : "Broaden the category filter or clear the query."}
                  </p>
                </li>
              )}
              {filtered.map((a) => {
                const st = stateFor(a);
                return (
                  <li key={a.seq} className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${st === "ok" ? "flash-ok" : st === "bad" ? "flash-bad shake-x" : "hover:bg-navy/[0.03]"}`}>
                    <span className="font-mono text-[10px] text-steel w-11 shrink-0">#{String(a.seq).padStart(3, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-ink leading-snug">
                        <span className="font-semibold">{a.actor}</span>{" "}
                        <span className="font-mono text-[9.5px] uppercase tracking-wide text-steel">{a.action.split("_").join(" ")}</span>{" "}
                        {a.caseId !== "—" && <span className="font-mono text-[9.5px] text-plum">{a.caseId}</span>}
                      </p>
                      <p className="font-mono text-[10px] text-ink3 truncate">{a.detail || a.docId} · ip {a.ip}</p>
                    </div>
                    <span className="font-mono text-[9.5px] text-ink3 whitespace-nowrap" title={a.hash}>
                      {st === "ok" ? <span className="text-green inline-flex items-center gap-1"><IcCheck c="w-3 h-3" />ok</span> : st === "bad" ? <span className="text-crimson">✗</span> : shortHash(a.hash, 6, 4)}
                    </span>
                    <span className="font-mono text-[10px] text-ink3 whitespace-nowrap w-14 text-right">{timeAgo(a.ts)}</span>
                  </li>
                );
              })}
            </ul>
            <footer className="px-4 py-2 border-t border-line bg-paper2/50 flex items-center justify-between">
              <p className="font-mono text-[9.5px] uppercase tracking-widest text-ink3">each link commits to its predecessor's hash</p>
              <p className="font-mono text-[9.5px] uppercase tracking-widest text-ink3">no delete control exists</p>
            </footer>
          </Panel>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* login history */}
          <Panel title={t("audit.logins")} delay={160} right={<IcKey c="w-4 h-4 text-ink3" />}>
            <ul className="divide-y divide-line/70 max-h-[380px] overflow-y-auto">
              {p.logins.slice(0, 14).map((l) => (
                <li key={l.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[9.5px] uppercase tracking-widest font-bold ${KIND_STYLE[l.kind] ?? "text-ink2"}`}>{l.kind.split("_").join(" ")}</span>
                    <span className="ml-auto font-mono text-[10px] text-ink3">{timeAgo(l.ts)}</span>
                  </div>
                  <p className="text-[12.5px] text-ink font-medium mt-0.5">{l.userName}</p>
                  <p className="font-mono text-[10px] text-ink3 flex items-center gap-1.5 mt-0.5">
                    <IcEye c="w-3 h-3" /> {l.device} · {l.ip} · {l.location}
                  </p>
                  <p className="text-[11.5px] text-ink2 mt-0.5">{l.note}</p>
                </li>
              ))}
              {p.logins.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
            </ul>
          </Panel>

          {/* security events */}
          <Panel title={t("audit.security")} delay={220} right={<IcAlert c="w-4 h-4 text-ink3" />}>
            <ul className="divide-y divide-line/70 max-h-[340px] overflow-y-auto">
              {p.security.map((s) => (
                <li key={s.id} className={`px-4 py-2.5 ${s.reviewed ? "opacity-55" : ""}`}>
                  <div className="flex items-center gap-2">
                    <SeverityBadge sev={s.severity} />
                    <span className="font-mono text-[9.5px] uppercase tracking-widest text-steel">{s.kind.split("_").join(" ")}</span>
                    <span className="ml-auto font-mono text-[10px] text-ink3 inline-flex items-center gap-1"><IcClock c="w-3 h-3" />{timeAgo(s.ts)}</span>
                  </div>
                  <p className="text-[12.5px] text-ink leading-snug mt-1">{s.detail}</p>
                  {!s.reviewed ? (
                    <button onClick={() => p.onReviewSecurity(s.id)} className="font-mono text-[9.5px] uppercase tracking-widest text-steel hover:text-crimson transition-colors mt-1">
                      mark reviewed →
                    </button>
                  ) : (
                    <p className="font-mono text-[9.5px] uppercase tracking-widest text-green mt-1 inline-flex items-center gap-1"><IcCheck c="w-3 h-3" /> reviewed</p>
                  )}
                </li>
              ))}
              {p.security.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-green">all clear</li>}
            </ul>
          </Panel>

          <div className="rise border border-line bg-card px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink3 mb-2">Monitored signals</p>
            <div className="flex flex-wrap gap-1.5">
              {["repeated failed logins", "unusual device", "concurrent sessions", "bulk downloads", "denied-access patterns", "digest mismatch"].map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
