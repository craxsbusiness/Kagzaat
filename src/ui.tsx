import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { uid } from "./lib";
import { useT } from "./i18n";
import { IcX } from "./icons";

/* ------------------------------------------------------------------ */
/* Notifications — silent feed (rendered in the hamburger menu)        */
/* ------------------------------------------------------------------ */
export type ToastKind = "success" | "info" | "warning" | "error";

export interface FeedItem {
  id: string;
  ts: string;
  kind: ToastKind;
  title: string;
  body?: string;
  read: boolean;
}

interface ToastApi {
  push: (kind: ToastKind, title: string, body?: string) => void;
}
interface FeedApi {
  feed: FeedItem[];
  unread: number;
  lastId: string | null;
  markAll: () => void;
  markOne: (id: string) => void;
}

const ToastCtx = createContext<ToastApi>({ push: () => {} });
const FeedCtx = createContext<FeedApi>({ feed: [], unread: 0, lastId: null, markAll: () => {}, markOne: () => {} });

export const useToast = () => useContext(ToastCtx).push;
export const useFeed = () => useContext(FeedCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  /* every notification is captured quietly — nothing pops on screen */
  const push = useCallback((kind: ToastKind, title: string, body?: string) => {
    const item: FeedItem = { id: uid("F"), ts: new Date().toISOString(), kind, title, body, read: false };
    setFeed((f) => [item, ...f].slice(0, 40));
  }, []);

  const api = useMemo<FeedApi>(
    () => ({
      feed,
      unread: feed.filter((x) => !x.read).length,
      lastId: feed[0]?.id ?? null,
      markAll: () => setFeed((f) => f.map((x) => (x.read ? x : { ...x, read: true }))),
      markOne: (id: string) => setFeed((f) => f.map((x) => (x.id === id && !x.read ? { ...x, read: true } : x))),
    }),
    [feed]
  );

  return (
    <ToastCtx.Provider value={{ push }}>
      <FeedCtx.Provider value={api}>{children}</FeedCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */
export type CaseStatusKey = "FILED" | "INVESTIGATION" | "TRIAL" | "JUDGMENT" | "CLOSED" | "DISMISSED";

const CASE_STATUS_STYLE: Record<CaseStatusKey, string> = {
  FILED: "bg-steel/10 text-steel border-steel/50",
  INVESTIGATION: "bg-amber/10 text-amber border-amber/50",
  TRIAL: "bg-azure/10 text-azure border-azure/50",
  JUDGMENT: "bg-navy/10 text-ink border-navy/40",
  CLOSED: "bg-ink3/10 text-ink2 border-ink3/50",
  DISMISSED: "bg-crimson/10 text-crimson border-crimson/50",
};

export function CaseStatusBadge({ status, small = false }: { status: CaseStatusKey; small?: boolean }) {
  const t = useT();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold uppercase tracking-[0.06em] whitespace-nowrap ${small ? "text-[9.5px] px-2 py-0.5" : "text-[10.5px] px-2.5 py-0.5"} ${CASE_STATUS_STYLE[status]}`}>
      <span className="inline-block w-1.5 h-1.5 bg-current" />
      {t(`st.${status}`)}
    </span>
  );
}

export type DocClassKey = "PUBLIC" | "COURT" | "INVESTIGATION" | "PRIVILEGED" | "RESTRICTED";
const DOC_CLASS_STYLE: Record<DocClassKey, string> = {
  PUBLIC: "bg-green/10 text-green border-green/45",
  COURT: "bg-azure/10 text-azure border-azure/45",
  INVESTIGATION: "bg-amber/10 text-amber border-amber/50",
  PRIVILEGED: "bg-plum/10 text-plum border-plum/45",
  RESTRICTED: "bg-crimson/10 text-crimson border-crimson/50",
};

export function DocClassBadge({ level, small = false }: { level: DocClassKey; small?: boolean }) {
  const t = useT();
  return (
    <span className={`inline-flex items-center rounded-full border font-mono font-semibold uppercase tracking-[0.06em] whitespace-nowrap ${small ? "text-[9px] px-1.5 py-px" : "text-[10px] px-2 py-0.5"} ${DOC_CLASS_STYLE[level]}`}>
      {t(`dcls.${level}`)}
    </span>
  );
}

export type DocStatusKey = "DRAFT" | "REVIEW" | "APPROVED" | "SIGNED" | "RESTRICTED" | "ARCHIVED";
const DOC_STATUS_STYLE: Record<DocStatusKey, string> = {
  DRAFT: "text-ink2 border-ink3/50 bg-ink3/5",
  REVIEW: "text-amber border-amber/60 bg-amber/5",
  APPROVED: "text-green border-green/55 bg-green/5",
  SIGNED: "text-azure border-azure/60 bg-azure/5",
  RESTRICTED: "text-crimson border-crimson/60 bg-crimson/5",
  ARCHIVED: "text-ink3 border-ink3/50 bg-ink3/5",
};

export function DocStatusStamp({ status, small = false }: { status: DocStatusKey; small?: boolean }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center border font-display font-semibold uppercase tracking-[0.12em] ${small ? "text-[9px] px-1.5 py-px" : "text-[10.5px] px-2 py-0.5"} ${DOC_STATUS_STYLE[status]}`}
      style={{ borderStyle: status === "SIGNED" ? "double" : "solid", borderWidth: status === "SIGNED" ? 3 : 1 }}
    >
      {t(`dst.${status}`)}
    </span>
  );
}

export function SeverityBadge({ sev }: { sev: "INFO" | "WARN" | "CRITICAL" }) {
  const s =
    sev === "CRITICAL"
      ? "bg-crimson/10 text-crimson border-crimson/50"
      : sev === "WARN"
      ? "bg-amber/10 text-amber border-amber/50"
      : "bg-steel/10 text-steel border-steel/40";
  return (
    <span className={`inline-flex items-center gap-1 border font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 ${s}`}>
      {sev === "CRITICAL" && <span className="w-1.5 h-1.5 bg-current pulse-red" />}
      {sev}
    </span>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "navy" | "red" | "green" | "amber" | "plum" | "azure" }) {
  const t =
    tone === "navy"
      ? "bg-navy text-paper border-navy"
      : tone === "red"
      ? "bg-crimson/10 text-crimson border-crimson/40"
      : tone === "green"
      ? "bg-green/10 text-green border-green/40"
      : tone === "amber"
      ? "bg-amber/10 text-amber border-amber/40"
      : tone === "plum"
      ? "bg-plum/10 text-plum border-plum/40"
      : tone === "azure"
      ? "bg-azure/10 text-azure border-azure/40"
      : "bg-paper2 text-ink2 border-line";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-[10px] font-mono tracking-wide uppercase whitespace-nowrap ${t}`}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */
export function Panel({ title, right, children, className = "", delay = 0 }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`rise relative bg-card/90 border border-line rounded-[14px] overflow-hidden shadow-[inset_0_1px_0_color-mix(in_srgb,var(--brass)_28%,transparent),0_1px_2px_rgba(0,0,0,0.05),0_12px_28px_-20px_var(--shadowc)] ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {title !== undefined && (
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line bg-paper2/60">
          <h3 className="font-display font-semibold uppercase tracking-[0.14em] text-[13px] text-navy dark:text-ink flex items-center gap-2">
            <span className="w-1 h-3.5 bg-crimson inline-block" />
            {title}
          </h3>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function KV({ k, v, mono = false }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-ink3">{k}</dt>
      <dd className={`text-[13.5px] text-ink font-medium mt-0.5 break-words ${mono ? "font-mono text-[12px]" : ""}`}>{v}</dd>
    </div>
  );
}

export function StatTile({ label, value, sub, tone = "navy", delay = 0 }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "navy" | "red" | "amber" | "green" | "azure" | "plum"; delay?: number }) {
  const bar =
    tone === "red" ? "bg-crimson" : tone === "amber" ? "bg-amber" : tone === "green" ? "bg-green2" : tone === "azure" ? "bg-azure" : tone === "plum" ? "bg-plum" : "bg-navy";
  return (
    <div className="rise relative bg-card/90 border border-line rounded-[14px] px-4 pt-3.5 pb-3 overflow-hidden group hover:border-ink3 hover:-translate-y-0.5 transition-all duration-200" style={{ animationDelay: `${delay}ms` }}>
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${bar} group-hover:w-[5px] transition-all duration-300`} />
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink3">{label}</p>
      <p className="font-display font-semibold text-[34px] leading-none text-ink mt-1.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11.5px] text-ink2 mt-1.5">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal shell                                                         */
/* ------------------------------------------------------------------ */
export function Modal({ onClose, children, wide = false }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={`modal-in relative bg-paper border border-line rounded-2xl shadow-2xl shadow-navy/40 w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[88vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line bg-navy text-paper">
      <div>
        <h2 className="font-display font-semibold uppercase tracking-[0.14em] text-[16px] leading-tight">{title}</h2>
        {sub && <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/55 mt-1">{sub}</p>}
      </div>
      <button onClick={onClose} className="p-1.5 border border-paper/25 hover:bg-paper/10 transition-colors" aria-label="Close">
        <IcX c="w-4 h-4" />
      </button>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons — larger targets for accessibility                          */
/* ------------------------------------------------------------------ */
export function Btn({ children, onClick, kind = "primary", disabled = false, className = "", title, type = "button" }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger" | "navy" | "subtle" | "green"; disabled?: boolean; className?: string; title?: string; type?: "button" | "submit" }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-display font-medium uppercase tracking-[0.1em] text-[12.5px] px-3.5 py-2 rounded-lg border transition-all duration-150 hover:shadow-[0_4px_14px_-6px_var(--shadowc)] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap";
  const kinds = {
    primary: "bg-crimson text-paper border-crimson hover:bg-crimson2 hover:border-crimson2",
    navy: "bg-navy text-paper border-navy hover:bg-navy2 hover:border-navy2",
    green: "bg-green text-paper border-green hover:opacity-90",
    danger: "bg-card text-crimson border-crimson/60 hover:bg-crimson/10",
    ghost: "bg-card text-ink border-line hover:border-navy hover:bg-paper2",
    subtle: "bg-transparent text-ink2 border-transparent hover:text-ink hover:border-line",
  };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={`${base} ${kinds[kind]} ${className}`}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Clipboard hook                                                      */
/* ------------------------------------------------------------------ */
export function useCopy(): { copied: string | null; copy: (text: string, key: string) => void } {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* unavailable */
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };
  return { copied, copy };
}

/* ------------------------------------------------------------------ */
/* Case status stepper                                                 */
/* ------------------------------------------------------------------ */
export function StatusStepper({ status }: { status: CaseStatusKey }) {
  const t = useT();
  const flow: CaseStatusKey[] = ["FILED", "INVESTIGATION", "TRIAL", "JUDGMENT", "CLOSED"];
  const terminal = status === "CLOSED" || status === "DISMISSED";
  const idx = flow.indexOf(status === "DISMISSED" ? "CLOSED" : status);
  return (
    <ol className="flex items-center flex-wrap gap-y-1.5">
      {flow.map((s, i) => {
        const reached = i <= idx;
        const current = i === idx && (!terminal || status === "CLOSED");
        return (
          <li key={s} className="flex items-center">
            <span className={`font-mono text-[9.5px] uppercase tracking-[0.08em] px-1.5 py-1 border transition-colors ${current ? "bg-navy text-paper border-navy" : reached ? "text-ink border-navy/50 bg-navy/5" : "text-ink3 border-line bg-paper2/50"}`}>
              {t(`st.${s}`)}
            </span>
            {i < flow.length - 1 && <span className={`w-4 h-px mx-1 ${i < idx ? "bg-navy/50" : "bg-line"}`} />}
          </li>
        );
      })}
      {status === "DISMISSED" && (
        <li className="ml-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] px-1.5 py-1 border bg-crimson/10 text-crimson border-crimson/50">
            {t("st.DISMISSED")}
          </span>
        </li>
      )}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Forbidden (403) panel — never discloses existence                   */
/* ------------------------------------------------------------------ */
export function ForbiddenPanel({ attempted, onBack }: { attempted: string; onBack: () => void }) {
  return (
    <div className="rise max-w-xl mx-auto mt-10">
      <div className="arch border-2 border-dashed border-crimson/60 bg-crimson/[0.04] px-8 pt-14 pb-10 text-center">
        <p className="font-display font-bold text-[64px] leading-none text-crimson/80 select-none">403</p>
        <p className="font-display uppercase tracking-[0.2em] text-crimson text-[15px] mt-2">Forbidden — not disclosed</p>
        <p className="text-[13.5px] text-ink2 mt-4 leading-relaxed max-w-md mx-auto">
          Your request for <span className="font-mono text-[12px] text-ink">{attempted}</span> was rejected by the authorization gateway.
          Whether a record with this identifier exists is <em>not disclosed</em> to your role. This attempt has been written to the
          tamper-evident audit ledger with your session identity attached.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink3 mt-4">Repeated attempts may trigger a security review</p>
        <div className="mt-6">
          <Btn kind="navy" onClick={onBack}>Return to my docket</Btn>
        </div>
      </div>
      <div className="mt-4 font-mono text-[10.5px] text-ink3 border-l-2 border-line pl-3 leading-relaxed">
        <p>GATEWAY · authenticate ✓ → role ✓ → court/department ✓ → case relationship ✗ → DENY</p>
        <p>AUDIT · ACCESS_DENIED event appended · chain intact · {new Date().toISOString()}</p>
      </div>
    </div>
  );
}
