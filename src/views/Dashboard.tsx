import { useMemo } from "react";
import type { ChainLink } from "../lib";
import { fmtDate, fmtDateTime, isToday, shortHash, timeAgo, useCountUp } from "../lib";
import type { CaseFile, Court, EvidenceItem, LegalDoc, SecurityEvent, User } from "../data";
import { CASE_FLOW, ROLE_LABEL, canSeeDoc, caseReadOnly, visibleCases } from "../data";
import { Btn, CaseStatusBadge, Chip, DocClassBadge, Panel, SeverityBadge, StatTile } from "../ui";
import { useT } from "../i18n";
import {
  IcAlert, IcCalendar, IcChain, IcChevR, IcCourt, IcDownload, IcFile, IcFolder, IcGavel,
  IcInbox, IcPulse, IcScale, IcSend, IcShield, IcUsers,
} from "../icons";

export interface DashProps {
  user: User;
  users: User[];
  courts: Court[];
  cases: CaseFile[];
  docs: LegalDoc[];
  evidence: EvidenceItem[];
  audit: ChainLink[];
  security: SecurityEvent[];
  onOpenCase: (id: string, tab?: string) => void;
  onGo: (view: string) => void;
  onVerifyChain: () => void;
  onDownloadDoc: (docId: string) => void;
}

let COURTS: Court[] = [];

export default function Dashboard(p: DashProps) {
  COURTS = p.courts;
  const t = useT();
  const mine = useMemo(() => visibleCases(p.user, p.cases), [p.user, p.cases]);
  const mineIds = useMemo(() => new Set(mine.map((c) => c.id)), [mine]);
  const myDocs = useMemo(
    () => p.docs.filter((d) => mineIds.has(d.caseId) && canSeeDoc(p.user, p.cases.find((c) => c.id === d.caseId)!, d)),
    [p.docs, p.cases, mineIds, p.user]
  );
  const scopeAudit = useMemo(
    () => [...p.audit].sort((a, b) => b.ts.localeCompare(a.ts)).filter((a) => a.caseId === "—" || mineIds.has(a.caseId)),
    [p.audit, mineIds]
  );
  const fullAudit = useMemo(() => [...p.audit].sort((a, b) => b.ts.localeCompare(a.ts)), [p.audit]);

  const r = p.user.role;
  const courtName = p.courts.find((c) => p.user.courtIds[0] && c.id === p.user.courtIds[0])?.name;

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink3">{fmtDate(new Date().toISOString())}</p>
          <h1 className="font-display font-semibold uppercase text-[30px] leading-none tracking-wide text-ink mt-1">{p.user.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <Chip tone="navy">{ROLE_LABEL[r]}</Chip>
            <Chip>{p.user.unit}</Chip>
            {courtName && <Chip tone="azure">{courtName}</Chip>}
          </div>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink3 border border-line bg-card px-3 py-2 leading-relaxed">
          {t("dash.policy")} · {p.user.clearanceNote}
          <br />
          <span className="text-crimson">{t("dash.ledgered")}</span>
        </p>
      </div>

      {/* first-run banner */}
      {p.cases.length === 0 && (
        <div className="rise relative overflow-hidden border border-navy/25 bg-navy text-paper px-6 py-6">
          <div className="scanline absolute inset-0 pointer-events-none opacity-60" />
          <div className="relative flex flex-wrap items-center gap-5">
            <span className="w-12 h-12 bg-crimson flex items-center justify-center shrink-0"><IcShield c="w-6 h-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#e0b968]">{t("dash.emptyKicker")}</p>
              <h2 className="font-display font-semibold uppercase tracking-wide text-[21px] leading-tight mt-1">
                {p.user.role === "ADMIN" ? t("dash.emptyAdmin") : t("dash.emptyOther")}
              </h2>
              <p className="text-[13.5px] text-paper/70 leading-relaxed mt-1.5 max-w-2xl">
                {p.user.role === "ADMIN" ? t("dash.emptyAdminBody") : t("dash.emptyOtherBody")}
              </p>
            </div>
            {p.user.role === "ADMIN" && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <Btn kind="primary" onClick={() => p.onGo("admin")}><IcCourt c="w-3.5 h-3.5" /> {t("dash.openAdmin")}</Btn>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/45 text-center">{t("dash.flow")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {r === "JUDGE" && <JudgeDash {...p} mine={mine} myDocs={myDocs} scopeAudit={scopeAudit} />}
      {r === "LAWYER" && <LawyerDash {...p} mine={mine} myDocs={myDocs} scopeAudit={scopeAudit} />}
      {r === "POLICE" && <PoliceDash {...p} mine={mine} myDocs={myDocs} />}
      {(r === "ACCUSED" || r === "VICTIM") && <PartyDash {...p} mine={mine} myDocs={myDocs} />}
      {r === "ADMIN" && <AdminDash {...p} mine={mine} fullAudit={fullAudit} />}
      {r === "AUDITOR" && <AuditorDash {...p} fullAudit={fullAudit} />}
    </div>
  );
}

/* ================================================================== */
function Tile({ label, value, tone, delay }: { label: string; value: number; tone?: "navy" | "red" | "amber" | "green" | "azure" | "plum"; delay?: number }) {
  const v = useCountUp(value);
  return <StatTile label={label} value={v} tone={tone} delay={delay} />;
}

function CaseTable({ cases, onOpen, title, delay = 0 }: { cases: CaseFile[]; onOpen: (id: string) => void; title: string; delay?: number }) {
  const t = useT();
  return (
    <Panel title={title} delay={delay}>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="border-b border-line bg-paper2/70">
              {["Case", t("tab.timeline"), "Filed", t("dash.upcoming"), ""].map((h, i) => (
                <th key={i} className="px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c, i) => {
              const next = c.hearings.filter((h) => h.status === "SCHEDULED").sort((a, b) => a.ts.localeCompare(b.ts))[0];
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)} className="rise group cursor-pointer border-b border-line/70 last:border-0 hover:bg-navy/[0.045] transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-[11px] text-steel font-semibold">{c.id}</p>
                    <p className="text-[14px] font-semibold text-ink leading-tight group-hover:text-navy transition-colors">{c.title}</p>
                    <p className="font-mono text-[10px] text-ink3 mt-0.5">{c.cno} · {COURTS.find((x) => x.id === c.courtId)?.name}</p>
                  </td>
                  <td className="px-4 py-3"><CaseStatusBadge status={c.status} small /></td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-ink2 whitespace-nowrap">{fmtDate(c.filedOn)}</td>
                  <td className="px-4 py-3">
                    {next ? (
                      <span className={`font-mono text-[11.5px] whitespace-nowrap ${isToday(next.ts) ? "text-crimson font-bold" : "text-ink2"}`}>
                        {isToday(next.ts) ? "TODAY " : ""}{fmtDateTime(next.ts)}
                      </span>
                    ) : (
                      <span className="font-mono text-[11.5px] text-ink3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink3 group-hover:text-crimson transition-colors"><IcChevR c="w-3.5 h-3.5" /></td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ActivityFeed({ items, title, delay = 0 }: { items: ChainLink[]; title: string; delay?: number }) {
  return (
    <Panel title={title} delay={delay}>
      <ul className="divide-y divide-line/70 max-h-[420px] overflow-y-auto">
        {items.slice(0, 14).map((a) => (
          <li key={a.seq} className="px-4 py-2.5 flex items-start gap-3">
            <span className={`mt-1.5 w-1.5 h-1.5 shrink-0 ${a.action.includes("DENIED") || a.action.includes("ALERT") ? "bg-crimson pulse-red" : "bg-navy/60"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-ink leading-snug">
                <span className="font-semibold">{a.actor}</span>{" "}
                <span className="font-mono text-[10px] uppercase tracking-wide text-steel">{a.action.split("_").join(" ").toLowerCase()}</span>
              </p>
              <p className="text-[11.5px] text-ink2 leading-snug mt-0.5">{a.detail || a.docId}</p>
            </div>
            <span className="font-mono text-[10px] text-ink3 whitespace-nowrap mt-0.5">{timeAgo(a.ts)}</span>
          </li>
        ))}
        {items.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
      </ul>
    </Panel>
  );
}

function UpcomingList({ mine, onOpen, delay = 0 }: { mine: CaseFile[]; onOpen: (id: string, tab?: string) => void; delay?: number }) {
  const t = useT();
  const rows = mine
    .flatMap((c) => c.hearings.filter((h) => h.status === "SCHEDULED").map((h) => ({ c, h })))
    .sort((a, b) => a.h.ts.localeCompare(b.h.ts))
    .slice(0, 6);
  return (
    <Panel title={t("dash.upcoming")} delay={delay}>
      <ul className="divide-y divide-line/70">
        {rows.map(({ c, h }) => (
          <li key={h.id}>
            <button onClick={() => onOpen(c.id, "hearings")} className="w-full px-4 py-3 text-left hover:bg-navy/[0.04] transition-colors flex items-center gap-3">
              <span className={`w-10 h-10 border flex flex-col items-center justify-center shrink-0 ${isToday(h.ts) ? "border-crimson text-crimson" : "border-line text-navy"}`}>
                <span className="font-display font-bold text-[15px] leading-none">{new Date(h.ts).getDate()}</span>
                <span className="font-mono text-[8px] uppercase">{fmtDate(h.ts).split(" ")[1]}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink leading-tight">{h.purpose}</span>
                <span className="block font-mono text-[10px] text-ink3 mt-0.5">{c.id} · {fmtDateTime(h.ts)}</span>
              </span>
              {isToday(h.ts) && <Chip tone="red">today</Chip>}
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
      </ul>
    </Panel>
  );
}

/* ================================================================== */
function JudgeDash(p: DashProps & { mine: CaseFile[]; myDocs: LegalDoc[]; scopeAudit: ChainLink[] }) {
  const t = useT();
  const active = p.mine.filter((c) => !caseReadOnly(c));
  const todayH = p.mine.flatMap((c) => c.hearings.filter((h) => h.status === "SCHEDULED" && isToday(h.ts))).length;
  const review = p.myDocs.filter((d) => d.status === "REVIEW").length;
  const closed = p.mine.filter((c) => caseReadOnly(c)).length;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label={t("dash.active")} value={active.length} tone="navy" delay={40} />
        <Tile label={t("dash.hearingsToday")} value={todayH} tone="red" delay={90} />
        <Tile label={t("dash.reviewQueue")} value={review} tone="amber" delay={140} />
        <Tile label={t("dash.closed")} value={closed} tone="plum" delay={190} />
      </div>
      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3 space-y-4">
          <CaseTable cases={active.slice(0, 6)} onOpen={p.onOpenCase} title={t("dash.docket")} delay={120} />
          <ActivityFeed items={p.scopeAudit} title={t("dash.recent")} delay={200} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <UpcomingList mine={p.mine} onOpen={p.onOpenCase} delay={160} />
          <ReviewQueue docs={p.myDocs} onOpen={p.onOpenCase} />
        </div>
      </div>
    </>
  );
}

function ReviewQueue({ docs, onOpen }: { docs: LegalDoc[]; onOpen: (id: string, tab?: string) => void }) {
  const t = useT();
  const q = docs.filter((d) => d.status === "REVIEW").slice(0, 5);
  return (
    <Panel title={t("dash.reviewQueue")} right={<IcInbox c="w-4 h-4 text-ink3" />}>
      <ul className="divide-y divide-line/70">
        {q.map((d) => (
          <li key={d.id}>
            <button onClick={() => onOpen(d.caseId, "documents")} className="w-full px-4 py-3 text-left hover:bg-navy/[0.04] transition-colors group">
              <div className="flex items-center gap-2">
                <IcFile c="w-3.5 h-3.5 text-amber" />
                <p className="text-[13px] font-semibold text-ink leading-tight group-hover:text-navy transition-colors truncate">{d.title}</p>
              </div>
              <p className="font-mono text-[10px] text-ink3 mt-1">{d.id} · {d.caseId} · v{d.versions.length}</p>
            </button>
          </li>
        ))}
        {q.length === 0 && <li className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
      </ul>
    </Panel>
  );
}

function LawyerDash(p: DashProps & { mine: CaseFile[]; myDocs: LegalDoc[]; scopeAudit: ChainLink[] }) {
  const t = useT();
  const active = p.mine.filter((c) => !caseReadOnly(c));
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label={t("dash.active")} value={active.length} tone="navy" delay={40} />
        <Tile label={t("dash.docs")} value={p.myDocs.length} tone="azure" delay={90} />
        <Tile label={t("dash.hearingsToday")} value={p.mine.flatMap((c) => c.hearings.filter((h) => h.status === "SCHEDULED" && isToday(h.ts))).length} tone="red" delay={140} />
        <Tile label={t("dash.reviewQueue")} value={p.myDocs.filter((d) => d.status === "REVIEW").length} tone="amber" delay={190} />
      </div>
      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3"><CaseTable cases={active.slice(0, 7)} onOpen={p.onOpenCase} title={t("dash.docket")} delay={120} /></div>
        <div className="lg:col-span-2 space-y-4">
          <UpcomingList mine={p.mine} onOpen={p.onOpenCase} delay={160} />
          <ActivityFeed items={p.scopeAudit} title={t("dash.recent")} delay={220} />
        </div>
      </div>
    </>
  );
}

function PoliceDash(p: DashProps & { mine: CaseFile[]; myDocs: LegalDoc[] }) {
  const t = useT();
  const inv = p.mine.filter((c) => c.status === "INVESTIGATION").length;
  const ev = p.evidence.filter((e) => p.mine.some((c) => c.id === e.caseId)).length;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label={t("dash.active")} value={p.mine.filter((c) => !caseReadOnly(c)).length} tone="navy" delay={40} />
        <Tile label={t("st.INVESTIGATION")} value={inv} tone="amber" delay={90} />
        <Tile label={t("tab.evidence")} value={ev} tone="green" delay={140} />
        <Tile label={t("dash.docs")} value={p.myDocs.length} tone="azure" delay={190} />
      </div>
      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3"><CaseTable cases={p.mine.slice(0, 7)} onOpen={p.onOpenCase} title={t("dash.docket")} delay={120} /></div>
        <div className="lg:col-span-2"><UpcomingList mine={p.mine} onOpen={p.onOpenCase} delay={160} /></div>
      </div>
    </>
  );
}

function PartyDash(p: DashProps & { mine: CaseFile[]; myDocs: LegalDoc[] }) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile label={t("nav.mycases")} value={p.mine.length} tone="navy" delay={40} />
        <Tile label={t("dash.docs")} value={p.myDocs.length} tone="azure" delay={90} />
        <Tile label={t("dash.upcoming")} value={p.mine.flatMap((c) => c.hearings.filter((h) => h.status === "SCHEDULED")).length} tone="amber" delay={140} />
      </div>
      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3">
          <Panel title={t("nav.mycases")} delay={120}>
            <ul className="divide-y divide-line/70">
              {p.mine.map((c) => {
                const next = c.hearings.filter((h) => h.status === "SCHEDULED").sort((a, b) => a.ts.localeCompare(b.ts))[0];
                const nDocs = p.myDocs.filter((d) => d.caseId === c.id).length;
                return (
                  <li key={c.id}>
                    <button onClick={() => p.onOpenCase(c.id)} className="w-full px-4 py-3.5 text-left hover:bg-navy/[0.04] transition-colors group">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-[11px] text-steel font-semibold">{c.id}</p>
                        <CaseStatusBadge status={c.status} small />
                      </div>
                      <p className="text-[14.5px] font-semibold text-ink mt-1 group-hover:text-navy transition-colors">{c.title}</p>
                      <p className="font-mono text-[10.5px] text-ink3 mt-1">
                        {next ? `${t("dash.upcoming")}: ${fmtDateTime(next.ts)}` : t("cases.noHearing")} · {nDocs} {t("cases.docsVisible")}
                      </p>
                    </button>
                  </li>
                );
              })}
              {p.mine.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
            </ul>
          </Panel>
        </div>
        <div className="lg:col-span-2">
          <Panel title={t("dash.docs")} delay={160}>
            <ul className="divide-y divide-line/70">
              {p.myDocs.slice(0, 6).map((d) => (
                <li key={d.id}>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <IcDownload c="w-4 h-4 text-navy shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink leading-tight truncate">{d.title}</p>
                      <p className="font-mono text-[10px] text-ink3 mt-0.5">{d.id} · {fmtDate(d.createdAt)}</p>
                    </div>
                    <DocClassBadge level={d.classification} small />
                    <button onClick={() => p.onDownloadDoc(d.id)} className="font-mono text-[9.5px] uppercase tracking-widest text-steel hover:text-crimson transition-colors">{t("act.download")}</button>
                  </div>
                </li>
              ))}
              {p.myDocs.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function AdminDash(p: DashProps & { mine: CaseFile[]; fullAudit: ChainLink[] }) {
  const t = useT();
  const pendingTrf = p.cases.flatMap((c) => c.transfers.filter((x) => x.status === "REQUESTED")).length;
  const unreviewed = p.security.filter((s) => !s.reviewed && s.severity !== "INFO").length;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label={t("cases.title")} value={p.cases.length} tone="navy" delay={40} />
        <Tile label={t("login.principals")} value={p.users.length} tone="azure" delay={90} />
        <Tile label={t("dash.transfers")} value={pendingTrf} tone="plum" delay={140} />
        <Tile label={t("dash.security")} value={unreviewed} tone="red" delay={190} />
      </div>
      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3 space-y-4">
          <CaseTable cases={p.cases.slice(0, 6)} onOpen={p.onOpenCase} title={t("cases.full")} delay={120} />
          <SecurityStrip security={p.security} onGo={p.onGo} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Panel title={t("admin.courts")} delay={160}>
            <ul className="divide-y divide-line/70">
              {p.courts.map((c) => (
                <li key={c.id} className="px-4 py-3 flex items-center gap-3">
                  <IcCourt c="w-4 h-4 text-navy" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink leading-tight">{c.name}</p>
                    <p className="font-mono text-[10px] text-ink3 mt-0.5">{c.id} · {c.level} · {c.location}</p>
                  </div>
                  <Chip>{p.cases.filter((x) => x.courtId === c.id).length} cases</Chip>
                </li>
              ))}
              {p.courts.length === 0 && (
                <li className="px-4 py-6 text-center">
                  <p className="font-mono text-[10.5px] uppercase tracking-widest text-ink3">{t("admin.addCourt")}</p>
                  <Btn kind="navy" className="mt-2" onClick={() => p.onGo("admin")}><IcCourt c="w-3.5 h-3.5" /> {t("dash.openAdmin")}</Btn>
                </li>
              )}
            </ul>
          </Panel>
          <ActivityFeed items={p.fullAudit} title={t("dash.recent")} delay={220} />
        </div>
      </div>
    </>
  );
}

function SecurityStrip({ security, onGo }: { security: SecurityEvent[]; onGo: (v: string) => void }) {
  const t = useT();
  const hot = security.filter((s) => s.severity !== "INFO").slice(0, 4);
  return (
    <Panel title={t("dash.security")} right={<button onClick={() => onGo("audit")} className="font-mono text-[9.5px] uppercase tracking-widest text-steel hover:text-crimson transition-colors">{t("act.open")}</button>}>
      <ul className="divide-y divide-line/70">
        {hot.map((s) => (
          <li key={s.id} className="px-4 py-2.5 flex items-center gap-3">
            <SeverityBadge sev={s.severity} />
            <p className="text-[12.5px] text-ink leading-snug flex-1 truncate">{s.detail}</p>
            <span className="font-mono text-[10px] text-ink3 whitespace-nowrap">{timeAgo(s.ts)}</span>
          </li>
        ))}
        {hot.length === 0 && <li className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-widest text-green">all clear</li>}
      </ul>
    </Panel>
  );
}

function AuditorDash(p: DashProps & { fullAudit: ChainLink[] }) {
  const t = useT();
  const denied = p.fullAudit.filter((a) => a.action === "ACCESS_DENIED").length;
  const critical = p.security.filter((s) => s.severity === "CRITICAL" && !s.reviewed).length;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label={t("audit.chain")} value={p.fullAudit.length} tone="navy" delay={40} />
        <Tile label="ACCESS_DENIED" value={denied} tone="red" delay={90} />
        <Tile label={t("audit.security")} value={critical} tone="amber" delay={140} />
        <Tile label={t("audit.logins")} value={p.audit.filter((a) => a.action === "LOGIN").length} tone="plum" delay={190} />
      </div>
      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3">
          <Panel title={t("audit.chain")} delay={120} right={<Btn kind="navy" onClick={p.onVerifyChain}><IcChain c="w-3.5 h-3.5" /> {t("audit.verifyChain")}</Btn>}>
            <ul className="divide-y divide-line/70 max-h-[440px] overflow-y-auto">
              {p.fullAudit.slice(0, 12).map((a) => (
                <li key={a.seq} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="font-mono text-[10px] text-steel w-10 shrink-0">#{String(a.seq).padStart(3, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-ink leading-snug"><span className="font-semibold">{a.actor}</span> · {a.action.split("_").join(" ").toLowerCase()}</p>
                    <p className="font-mono text-[10px] text-ink3 truncate">{a.detail}</p>
                  </div>
                  <span className="font-mono text-[9.5px] text-ink3 whitespace-nowrap" title={a.hash}>{shortHash(a.hash, 6, 4)}</span>
                </li>
              ))}
              {p.fullAudit.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">{t("audit.genesis")}</li>}
            </ul>
          </Panel>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <SecurityStrip security={p.security} onGo={p.onGo} />
          <Panel title={t("dash.recent")} delay={200}>
            <div className="px-4 py-4 space-y-2.5">
              {[IcScale, IcGavel, IcSend, IcUsers, IcPulse].map((I, i) => (
                <p key={i} className="flex items-center gap-2.5 text-[12px] text-ink2">
                  <I c="w-3.5 h-3.5 text-navy" />
                  {["Read-only posture — no modification controls exposed", "Case closure & dismissal events fully ledgered", "Transfer chain preserves ID, docs, versions & ledger", "User lifecycle events append-only", "Hourly chain recomputation scheduled"][i]}
                </p>
              ))}
            </div>
          </Panel>
          <div className="rise border border-line bg-card px-4 py-3 flex items-center gap-3">
            <IcAlert c="w-4 h-4 text-amber" />
            <p className="text-[12px] text-ink2">{t("dash.ledgered")}</p>
          </div>
          <div className="hidden">{CASE_FLOW.length}</div>
        </div>
      </div>
    </>
  );
}
