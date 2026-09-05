import { useMemo, useState } from "react";
import type { ChainLink } from "../lib";
import { diffWords, fmtDate, fmtDateTime, shortHash, timeAgo, useReducedMotion } from "../lib";
import type { CaseFile, Court, DocVersion, EvidenceItem, LegalDoc, User } from "../data";
import {
  CASE_FLOW, DOC_TYPES, ROLE_LABEL,
  canApprove, canApproveTransfer, canCloseDismiss, canDeaccession, canDownload, canEditDoc,
  canEvidenceEvent, canInitiateTransfer, canScheduleHearing, canSeeCase, canSeeDoc, canSign,
  canTamperDrill, canUpload, caseReadOnly, visibleCases,
} from "../data";
import {
  Btn, CaseStatusBadge, Chip, DocClassBadge, DocStatusStamp, ForbiddenPanel, KV, Modal, ModalHead, Panel, StatusStepper, useCopy, useToast,
} from "../ui";
import { useT } from "../i18n";
import {
  IcAlert, IcArchive, IcCalendar, IcCheck, IcChevD, IcChevR, IcCopy, IcCourt, IcDownload, IcFile,
  IcFolder, IcGavel, IcHash, IcInbox, IcLock, IcPen, IcPlus, IcSend, IcSign, IcStamp, IcUndo,
  IcUpload, IcUsers, IcX,
} from "../icons";

/* ================================================================== */
export interface CasesProps {
  user: User;
  users: User[];
  courts: Court[];
  cases: CaseFile[];
  docs: LegalDoc[];
  evidence: EvidenceItem[];
  audit: ChainLink[];
  selectedId: string | null;
  selectedTab: string;
  onSelect: (id: string | null, tab?: string) => void;
  forbidden: string | null;
  onClearForbidden: () => void;
  attemptOpen: (id: string) => void;
  uploadDoc: (caseId: string, p: { title: string; type: string; classification: LegalDoc["classification"]; note: string; body: string; submitForReview: boolean }) => void;
  editDoc: (docId: string, note: string, body: string) => void;
  approveDoc: (docId: string) => void;
  signDoc: (docId: string) => void;
  downloadDoc: (docId: string) => void;
  onVerified: (docId: string, ok: boolean) => void;
  tamperDrill: (docId: string) => void;
  restoreDoc: (docId: string) => void;
  deaccessionDoc: (docId: string, to: "RESTRICTED" | "ARCHIVED", reason: string) => void;
  viewDoc: (docId: string) => void;
  addEvidenceEvent: (evId: string, action: string, note: string) => void;
  scheduleHearing: (caseId: string, tsIso: string, purpose: string) => void;
  initiateTransfer: (caseId: string, toCourtId: string, reason: string, orderRef: string) => void;
  decideTransfer: (caseId: string, trfId: string, approve: boolean) => void;
  closeCase: (caseId: string, kind: "CLOSED" | "DISMISSED", reason: string, orderRef: string, signed: boolean) => void;
}

let COURTS: Court[] = [];

const inputCls = "w-full bg-paper border border-line px-3 py-2 text-[13.5px] focus:outline-none focus:border-navy placeholder:text-ink3/70 transition-colors";
const labelCls = "font-mono text-[10px] uppercase tracking-[0.16em] text-ink3 block mb-1";

export default function CasesView(p: CasesProps) {
  COURTS = p.courts;
  const t = useT();
  const mine = useMemo(() => visibleCases(p.user, p.cases), [p.user, p.cases]);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("ALL");
  const [idInput, setIdInput] = useState("");
  const toast = useToast();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return mine
      .filter((c) => (fStatus === "ALL" ? true : c.status === fStatus))
      .filter((c) => (needle === "" ? true : [c.id, c.cno, c.title, c.firNumber ?? "", ...c.tags].join(" ").toLowerCase().includes(needle)))
      .sort((a, b) => b.filedOn.localeCompare(a.filedOn));
  }, [mine, q, fStatus]);

  if (p.forbidden) return <ForbiddenPanel attempted={p.forbidden} onBack={p.onClearForbidden} />;

  const selected = p.selectedId ? p.cases.find((c) => c.id === p.selectedId) : null;
  if (selected) {
    if (!canSeeCase(p.user, selected)) return <ForbiddenPanel attempted={selected.id} onBack={() => p.onSelect(null)} />;
    return <CaseDetail key={selected.id + (selected.closure?.ts ?? "") + selected.courtId} p={p} c={selected} />;
  }

  const isParty = p.user.role === "ACCUSED" || p.user.role === "VICTIM";

  return (
    <div className="space-y-4">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink3">
            {isParty ? t("cases.parties") : p.user.role === "ADMIN" || p.user.role === "AUDITOR" ? t("cases.full") : t("cases.docket")}
          </p>
          <h1 className="font-display font-semibold uppercase text-[30px] leading-none tracking-wide text-ink mt-1">
            {isParty ? t("cases.myTitle") : t("cases.title")}
          </h1>
        </div>
        {!isParty && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const id = idInput.trim().toUpperCase();
              if (!id) return;
              p.attemptOpen(id);
              setIdInput("");
              toast("info", "Request routed through authorization gateway", "Allow / deny decided centrally; outcome ledgered.");
            }}
          >
            <input
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder={t("cases.openById")}
              className="w-[300px] max-w-[58vw] bg-card border border-line px-3 py-2 text-[12.5px] font-mono focus:outline-none focus:border-navy transition-colors"
            />
            <Btn kind="navy" type="submit"><IcFolder c="w-3.5 h-3.5" /> {t("act.open")}</Btn>
          </form>
        )}
      </div>

      {p.cases.length === 0 && (
        <div className="rise border-2 border-dashed border-line2 bg-card px-6 py-12 text-center">
          <span className="inline-flex w-14 h-14 border-2 border-navy/30 text-navy/60 items-center justify-center"><IcFolder c="w-7 h-7" /></span>
          <p className="font-display uppercase tracking-[0.2em] text-navy text-[17px] mt-4">{t("cases.emptyReg")}</p>
          <p className="text-[13px] text-ink2 mt-2 max-w-lg mx-auto leading-relaxed">
            {p.user.role === "ADMIN" ? t("cases.emptyRegAdmin") : t("cases.emptyRegOther")}
          </p>
        </div>
      )}

      {p.cases.length > 0 && (
        <>
          <div className="rise flex flex-wrap items-center gap-2" style={{ animationDelay: "60ms" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("cases.searchPh")}
              className="flex-1 min-w-[200px] max-w-sm bg-card border border-line px-3 py-2 text-[13px] focus:outline-none focus:border-navy placeholder:text-ink3/70 transition-colors"
            />
            {["ALL", ...CASE_FLOW, "DISMISSED"].map((s) => (
              <button
                key={s}
                onClick={() => setFStatus(s)}
                className={`font-mono text-[10.5px] uppercase tracking-[0.08em] px-2.5 py-2 border transition-colors ${
                  fStatus === s ? "bg-navy text-paper border-navy" : "bg-card text-ink2 border-line hover:border-navy"
                }`}
              >
                {s === "ALL" ? `${mine.length}` : s}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((c, i) => {
              const next = c.hearings.filter((h) => h.status === "SCHEDULED").sort((a, b) => a.ts.localeCompare(b.ts))[0];
              const docCount = p.docs.filter((d) => d.caseId === c.id && canSeeDoc(p.user, c, d)).length;
              return (
                <button
                  key={c.id}
                  onClick={() => p.attemptOpen(c.id)}
                  className="rise text-left bg-card border border-line p-4 hover:border-navy hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-18px_var(--shadowc)] transition-all duration-200 group"
                  style={{ animationDelay: `${Math.min(i * 55, 440)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-steel font-semibold">{c.id}</p>
                      <h3 className="font-display font-semibold uppercase tracking-wide text-[16.5px] text-ink leading-tight mt-0.5 group-hover:text-crimson transition-colors">{c.title}</h3>
                    </div>
                    <CaseStatusBadge status={c.status} small />
                  </div>
                  <p className="font-mono text-[10.5px] text-ink3 mt-1.5">
                    {c.cno} · {COURTS.find((x) => x.id === c.courtId)?.name}
                    {c.prevCourtId && <span className="text-plum"> · {COURTS.find((x) => x.id === c.prevCourtId)?.name}</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <Chip tone="navy">{c.type}</Chip>
                    {c.firNumber && <Chip>{c.firNumber}</Chip>}
                    {c.transfers.length > 0 && <Chip tone="plum">{t("tab.transfers")}</Chip>}
                    {caseReadOnly(c) && <Chip tone="red">{t("cases.readOnly")}</Chip>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-line flex items-center gap-4 text-[12px] text-ink2">
                    <span className="inline-flex items-center gap-1.5"><IcUsers c="w-3.5 h-3.5 text-ink3" /> {c.parties.length + c.lawyerIds.length + (c.ioId ? 1 : 0)} {t("cases.onRecord")}</span>
                    <span className="inline-flex items-center gap-1.5"><IcFile c="w-3.5 h-3.5 text-ink3" /> {docCount} {t("cases.docsVisible")}</span>
                    <span className={`inline-flex items-center gap-1.5 ml-auto font-mono text-[11px] ${next ? "text-navy" : "text-ink3"}`}>
                      <IcCalendar c="w-3.5 h-3.5" /> {next ? fmtDate(next.ts) : t("cases.noHearing")}
                    </span>
                    <span className="text-ink3 group-hover:text-crimson transition-colors"><IcChevR c="w-3.5 h-3.5" /></span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="md:col-span-2 border border-dashed border-line2 bg-card px-6 py-14 text-center">
                <p className="font-display uppercase tracking-[0.2em] text-ink2 text-[15px]">{t("cases.nomatch")}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
function CaseDetail({ p, c }: { p: CasesProps; c: CaseFile }) {
  const t = useT();
  const [tab, setTab] = useState(p.selectedTab || "documents");
  const [drawerDoc, setDrawerDoc] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "upload" | "transfer" | "close" | "dismiss">(null);
  const court = COURTS.find((x) => x.id === c.courtId);
  const judge = p.users.find((u) => u.id === c.judgeId);
  const io = p.users.find((u) => u.id === c.ioId);
  const ro = caseReadOnly(c);

  const TABS: { key: string; label: string }[] = [
    { key: "documents", label: t("tab.documents") },
    { key: "evidence", label: t("tab.evidence") },
    { key: "hearings", label: t("tab.hearings") },
    { key: "timeline", label: t("tab.timeline") },
    { key: "transfers", label: t("tab.transfers") },
    ...(p.user.role === "ACCUSED" || p.user.role === "VICTIM" ? [] : [{ key: "caseaudit", label: t("tab.caseaudit") }]),
  ];

  const openDoc = (id: string) => {
    p.viewDoc(id);
    setDrawerDoc(id);
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="rise">
        <button onClick={() => p.onSelect(null)} className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-steel hover:text-crimson transition-colors inline-flex items-center gap-1">
          <IcX c="w-3 h-3 rotate-45" /> {t("act.back")}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
          <div className="min-w-0">
            <p className="font-mono text-[11.5px] text-steel font-semibold">{c.id} · {c.cno}</p>
            <h1 className="font-display font-semibold uppercase text-[26px] leading-tight tracking-wide text-ink mt-0.5">{c.title}</h1>
            <p className="font-mono text-[11px] text-ink3 mt-1.5">
              {court?.name} · {judge?.name}
              {io && <> · IO {io.name}{c.stationId ? ` (${c.stationId})` : ""}</>}
              {c.firNumber && <> · {c.firNumber}</>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <CaseStatusBadge status={c.status} />
            {c.closure && (
              <span className="stamp-in inline-block border-[3px] border-double border-crimson/70 text-crimson font-display font-bold uppercase tracking-[0.2em] text-[12px] px-3 py-1 -rotate-3">
                {t(`st.${c.closure.kind}`)}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3"><StatusStepper status={c.status} /></div>
        {c.closure && (
          <div className="mt-3 border-l-4 border-crimson bg-crimson/5 px-4 py-2.5 text-[12.5px] text-ink2">
            <span className="font-semibold text-ink">{c.closure.kind === "CLOSED" ? t("st.CLOSED") : t("st.DISMISSED")}:</span> {c.closure.reason}{" "}
            <span className="font-mono text-[11px] text-ink3">· {c.closure.orderRef} · {c.closure.by} · {fmtDateTime(c.closure.ts)}{c.closure.signed ? " · ✍ signed" : ""}</span>
          </div>
        )}
        {!ro && (
          <div className="flex flex-wrap gap-2 mt-4">
            {canUpload(p.user, c) && <Btn kind="primary" onClick={() => setModal("upload")}><IcUpload c="w-3.5 h-3.5" /> {t("act.upload")}</Btn>}
            {canInitiateTransfer(p.user, c) && p.courts.length > 1 && (
              <Btn kind="ghost" onClick={() => setModal("transfer")}><IcSend c="w-3.5 h-3.5" /> {t("act.transfer")}</Btn>
            )}
            {canCloseDismiss(p.user, c) && (
              <>
                <Btn kind="navy" onClick={() => setModal("close")}><IcGavel c="w-3.5 h-3.5" /> {t("act.closeCase")}</Btn>
                <Btn kind="danger" onClick={() => setModal("dismiss")}><IcX c="w-3.5 h-3.5" /> {t("act.dismissCase")}</Btn>
              </>
            )}
            {ro === false && !canUpload(p.user, c) && (p.user.role === "ACCUSED" || p.user.role === "VICTIM") && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink3 self-center">{t("cases.parties")}</span>
            )}
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="rise flex gap-1 border-b border-line overflow-x-auto" style={{ animationDelay: "60ms" }}>
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => { setTab(tb.key); p.onSelect(c.id, tb.key); }}
            className={`font-display text-[12.5px] uppercase tracking-[0.1em] px-3.5 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              tab === tb.key ? "border-crimson text-ink bg-paper2/50" : "border-transparent text-ink3 hover:text-ink"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "documents" && <DocumentsTab p={p} c={c} onOpenDoc={openDoc} onUpload={() => setModal("upload")} />}
      {tab === "evidence" && <EvidenceTab p={p} c={c} />}
      {tab === "hearings" && <HearingsTab p={p} c={c} />}
      {tab === "timeline" && <TimelineTab p={p} c={c} />}
      {tab === "transfers" && <TransfersTab p={p} c={c} onInitiate={() => setModal("transfer")} />}
      {tab === "caseaudit" && <CaseAuditTab p={p} c={c} />}

      {drawerDoc && <DocDrawer p={p} c={c} docId={drawerDoc} onClose={() => setDrawerDoc(null)} />}
      {modal === "upload" && <UploadModal p={p} c={c} onClose={() => setModal(null)} />}
      {modal === "transfer" && <TransferModal p={p} c={c} onClose={() => setModal(null)} />}
      {(modal === "close" || modal === "dismiss") && <CloseDismissModal p={p} c={c} kind={modal === "close" ? "CLOSED" : "DISMISSED"} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ================================================================== */
function DocumentsTab({ p, c, onOpenDoc, onUpload }: { p: CasesProps; c: CaseFile; onOpenDoc: (id: string) => void; onUpload: () => void }) {
  const t = useT();
  const all = p.docs.filter((d) => d.caseId === c.id);
  const shown = all.filter((d) => canSeeDoc(p.user, c, d));
  const suppressed = all.length - shown.length;
  return (
    <Panel
      title={`${t("tab.documents")} · ${shown.length}`}
      delay={80}
      right={
        <div className="flex items-center gap-2">
          {suppressed > 0 && <Chip tone="red">{suppressed} withheld</Chip>}
          {canUpload(p.user, c) && <Btn kind="primary" onClick={onUpload}><IcPlus c="w-3.5 h-3.5" /> {t("act.upload")}</Btn>}
        </div>
      }
    >
      <ul className="divide-y divide-line/70">
        {shown.map((d) => {
          const latest = d.versions[d.versions.length - 1];
          return (
            <li key={d.id}>
              <button onClick={() => onOpenDoc(d.id)} className="w-full px-4 py-3 text-left hover:bg-navy/[0.04] transition-colors group flex items-center gap-3">
                <span className="text-navy"><IcFile c="w-4.5 h-4.5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink group-hover:text-navy transition-colors leading-tight">
                    {d.title}
                    {d.tampered && <span className="ml-2 text-crimson font-mono text-[10px] uppercase">⚠ integrity</span>}
                    {d.deaccessioned && <span className="ml-2 text-ink3 font-mono text-[10px] uppercase">deaccessioned</span>}
                  </span>
                  <span className="block font-mono text-[10px] text-ink3 mt-0.5">
                    {d.id} · {d.type} · v{d.versions.length} · {latest.author} · {fmtDateTime(latest.ts)} · {d.accessCount} views
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <DocClassBadge level={d.classification} small />
                  <DocStatusStamp status={d.status} small />
                </span>
                <IcChevR c="w-3.5 h-3.5 text-ink3 group-hover:text-crimson transition-colors" />
              </button>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="px-4 py-12 text-center">
            <p className="font-display uppercase tracking-[0.18em] text-ink2 text-[14px]">—</p>
            <p className="text-[12px] text-ink3 mt-1 font-mono">{suppressed > 0 ? `${suppressed} record(s) withheld by classification` : "No documents on file yet"}</p>
          </li>
        )}
      </ul>
    </Panel>
  );
}

/* ================================================================== */
function DocDrawer({ p, c, docId, onClose }: { p: CasesProps; c: CaseFile; docId: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const reduced = useReducedMotion();
  const { copied, copy } = useCopy();
  const d = p.docs.find((x) => x.id === docId)!;
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [lines, setLines] = useState<string[]>([]);
  const [result, setResult] = useState<null | { ok: boolean }>(null);
  const [cmpA, setCmpA] = useState(Math.max(1, d.versions.length - 1));
  const [cmpB, setCmpB] = useState(d.versions.length);
  const [editOpen, setEditOpen] = useState(false);
  const [deaccOpen, setDeaccOpen] = useState(false);

  const latest = d.versions[d.versions.length - 1];
  const canEdit = canEditDoc(p.user, c, d);

  const runVerify = () => {
    setPhase("running");
    setLines([]);
    setResult(null);
    const script = [`Reading ${d.id} · ${d.sizeKB.toLocaleString()} KB (WORM segment)`, "Streaming through SHA-256 engine…", "Comparing digests across version chain…"];
    const step = reduced ? 60 : 320;
    script.forEach((l, i) => setTimeout(() => setLines((x) => [...x, l]), step * (i + 1)));
    setTimeout(() => {
      const ok = !d.tampered;
      setResult({ ok });
      setPhase("done");
      p.onVerified(d.id, ok);
      toast(ok ? "success" : "error", ok ? "Integrity confirmed · MATCH" : "⚠ DOCUMENT INTEGRITY FAILURE", ok ? `${d.versions.length} version(s) concordant.` : "Stored digest disagrees with recomputed hash.");
    }, step * (script.length + 1));
  };

  const va = d.versions.find((v) => v.v === cmpA);
  const vb = d.versions.find((v) => v.v === cmpB);

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-navy/55 fade-in" onClick={onClose} />
      <aside className="drawer-in absolute right-0 top-0 bottom-0 w-full max-w-[640px] bg-paper border-l border-line shadow-2xl flex flex-col">
        <header className="border-b border-line bg-navy text-paper px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] tracking-[0.16em] text-paper/60 uppercase">{d.id} · {c.id}</p>
              <h2 className="font-display font-semibold uppercase text-[18px] leading-tight tracking-wide mt-1">{d.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <DocClassBadge level={d.classification} />
                <DocStatusStamp status={d.status} />
                <Chip>v{d.versions.length}</Chip>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 border border-paper/25 hover:bg-paper/10 transition-colors" aria-label="Close"><IcX c="w-4 h-4" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* current version */}
          <section className="rise">
            <h4 className="font-display uppercase tracking-[0.14em] text-[12.5px] text-ink flex items-center gap-2 mb-2">
              <span className="w-1 h-3.5 bg-crimson inline-block" /> {t("act.view")} · v{latest.v}
            </h4>
            <div className="border border-line bg-card">
              <div className="px-4 py-3 border-b border-line bg-paper2/50 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-mono text-[11px] font-bold text-crimson">v{latest.v}</span>
                <span className="text-[12.5px] text-ink2">{latest.note}</span>
                <span className="font-mono text-[10px] text-ink3 ml-auto">{latest.author} · {fmtDateTime(latest.ts)}</span>
              </div>
              <p className="px-4 py-4 text-[13.5px] leading-relaxed text-ink whitespace-pre-wrap">{latest.body}</p>
              <div className="px-4 py-2.5 border-t border-line flex flex-wrap items-center gap-3">
                <button onClick={() => copy(latest.hash, "cur")} className="font-mono text-[10.5px] text-steel hover:text-crimson transition-colors inline-flex items-center gap-1.5" title={latest.hash}>
                  <IcHash c="w-3 h-3" /> {shortHash(latest.hash, 10, 6)}
                  {copied === "cur" ? <IcCheck c="w-3 h-3 text-green" /> : <IcCopy c="w-3 h-3" />}
                </button>
                {latest.signature && (
                  <span className="font-mono text-[10px] text-azure inline-flex items-center gap-1"><IcSign c="w-3 h-3" /> {latest.signature.name} · {latest.signature.algo}</span>
                )}
                {d.status === "SIGNED" && <Chip tone="azure"><IcLock c="w-3 h-3" /> locked</Chip>}
              </div>
            </div>
          </section>

          {/* version ledger */}
          <section className="rise" style={{ animationDelay: "60ms" }}>
            <h4 className="font-display uppercase tracking-[0.14em] text-[12.5px] text-ink mb-2">{t("act.history")} · {d.versions.length}</h4>
            <ul className="border border-line divide-y divide-line">
              {[...d.versions].reverse().map((v) => (
                <li key={v.v} className={`px-3.5 py-2.5 ${v.v === latest.v ? "bg-paper2/60" : "bg-card"}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-[11.5px] font-bold px-1.5 py-0.5 border ${v.v === latest.v ? "text-crimson border-crimson/60" : "text-ink2 border-line"}`}>v{v.v}</span>
                    <span className="text-[12.5px] text-ink flex-1 truncate">{v.note}</span>
                    <span className="font-mono text-[9.5px] uppercase text-ink3">{v.status}</span>
                  </div>
                  <p className="font-mono text-[10px] text-ink3 mt-1">{fmtDateTime(v.ts)} · {v.author} · {shortHash(v.hash, 10, 6)} · prev {v.prevHash === "0".repeat(64) ? "GENESIS" : shortHash(v.prevHash, 6, 4)}</p>
                </li>
              ))}
            </ul>
            <p className="font-mono text-[9.5px] uppercase tracking-widest text-ink3 mt-1.5">originals are never overwritten — each edit mints a new version</p>
          </section>

          {/* integrity */}
          <section className="rise" style={{ animationDelay: "120ms" }}>
            <h4 className="font-display uppercase tracking-[0.14em] text-[12.5px] text-ink mb-2">{t("act.verify")}</h4>
            <div className="flex flex-wrap gap-2">
              <Btn kind="navy" onClick={runVerify} disabled={phase === "running"}><IcHash c="w-3.5 h-3.5" /> {t("act.verify")}</Btn>
              {canTamperDrill(p.user) && !d.tampered && (
                <Btn kind="danger" onClick={() => { p.tamperDrill(d.id); toast("warning", "Tamper drill armed", "Stored digest corrupted. Run verification to detect."); }}>
                  <IcAlert c="w-3.5 h-3.5" /> Drill: tamper
                </Btn>
              )}
              {d.tampered && <Btn kind="primary" onClick={() => { p.restoreDoc(d.id); toast("success", "Restored from WORM replica", "Digest recomputed from the immutable copy."); }}><IcUndo c="w-3.5 h-3.5" /> Restore from WORM</Btn>}
            </div>
            {phase !== "idle" && (
              <div className={`mt-3 border ${phase === "done" && result && !result.ok ? "border-crimson/60 shake-x" : "border-line"} bg-ink text-[#cfe6d9] font-mono text-[12px] px-4 py-3`}>
                {lines.map((l, i) => (
                  <p key={i} className="fade-in"><span className="text-[#5f7f6f]">$</span> {l}</p>
                ))}
                {phase === "running" && <p className="text-[#5f7f6f]">▍<span className="blink">█</span></p>}
                {phase === "done" && result && (
                  result.ok ? (
                    <p className="flash-ok border border-green2/70 bg-green/20 px-3 py-2 mt-1 text-[#a9e8cb] flex items-center gap-2"><IcCheck c="w-4 h-4" /> DIGEST CONCORDANCE · MATCH</p>
                  ) : (
                    <div className="flash-bad border border-crimson bg-crimson/25 px-3 py-2 mt-1 text-[#ffc9c4]">
                      <p className="flex items-center gap-2 font-bold"><IcAlert c="w-4 h-4" /> DOCUMENT INTEGRITY FAILURE</p>
                      <p className="text-[11px] opacity-90 mt-1">The document may have been modified outside the authorized system. Incident recorded in the security audit log.</p>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* compare */}
          {d.versions.length > 1 && (
            <section className="rise" style={{ animationDelay: "180ms" }}>
              <h4 className="font-display uppercase tracking-[0.14em] text-[12.5px] text-ink mb-2">Compare versions</h4>
              <div className="flex items-center gap-2 mb-2">
                <select className={`${inputCls} !w-28`} value={cmpA} onChange={(e) => setCmpA(Number(e.target.value))}>
                  {d.versions.map((v) => <option key={v.v} value={v.v}>v{v.v}</option>)}
                </select>
                <span className="font-mono text-[11px] text-ink3">→</span>
                <select className={`${inputCls} !w-28`} value={cmpB} onChange={(e) => setCmpB(Number(e.target.value))}>
                  {d.versions.map((v) => <option key={v.v} value={v.v}>v{v.v}</option>)}
                </select>
              </div>
              {va && vb && (
                <div className="border border-line bg-card px-4 py-3 text-[13px] leading-relaxed">
                  {diffWords(va.body, vb.body).map((tok, i) =>
                    tok.type === "same" ? (
                      <span key={i}>{tok.text}</span>
                    ) : (
                      <span key={i} className={tok.type === "add" ? "diff-add" : "diff-del"}>{tok.text}</span>
                    )
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* footer actions */}
        <footer className="border-t border-line bg-paper2/70 px-5 py-3 flex flex-wrap items-center gap-2">
          {canEdit && <Btn kind="primary" onClick={() => setEditOpen(true)}><IcPen c="w-3.5 h-3.5" /> {t("act.edit")} → v{d.versions.length + 1}</Btn>}
          {canApprove(p.user) && d.status === "REVIEW" && <Btn kind="green" onClick={() => p.approveDoc(d.id)}><IcCheck c="w-3.5 h-3.5" /> {t("act.approve")}</Btn>}
          {canSign(p.user) && d.status === "APPROVED" && <Btn kind="navy" onClick={() => p.signDoc(d.id)}><IcSign c="w-3.5 h-3.5" /> {t("act.sign")}</Btn>}
          {canDownload(p.user, c, d) && <Btn kind="ghost" onClick={() => p.downloadDoc(d.id)}><IcDownload c="w-3.5 h-3.5" /> {t("act.download")}</Btn>}
          {canDeaccession(p.user) && !d.deaccessioned && <Btn kind="subtle" onClick={() => setDeaccOpen(true)}><IcArchive c="w-3.5 h-3.5" /> Deaccession</Btn>}
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-ink3">{d.accessCount} accesses logged</span>
        </footer>

        {editOpen && <EditModal p={p} d={d} onClose={() => setEditOpen(false)} />}
        {deaccOpen && <DeaccessionModal p={p} d={d} onClose={() => setDeaccOpen(false)} />}
      </aside>
    </div>
  );
}

function EditModal({ p, d, onClose }: { p: CasesProps; d: LegalDoc; onClose: () => void }) {
  const t = useT();
  const [note, setNote] = useState("");
  const [body, setBody] = useState(d.versions[d.versions.length - 1].body);
  const valid = note.trim().length >= 4 && body.trim().length >= 20;
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={`${t("act.edit")} · ${d.id}`} sub={`creates v${d.versions.length + 1} — v${d.versions.length} is preserved untouched`} onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          p.editDoc(d.id, note.trim(), body.trim());
          onClose();
        }}
      >
        <div>
          <label className={labelCls}>Change description (required, ledgered)</label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Annexure C substituted; exhibit list renumbered" />
        </div>
        <div>
          <label className={labelCls}>Document text</label>
          <textarea className={`${inputCls} min-h-[220px] font-mono text-[12.5px] leading-relaxed`} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>{t("act.cancel")}</Btn>
          <Btn type="submit" disabled={!valid}><IcPen c="w-3.5 h-3.5" /> {t("act.edit")} → v{d.versions.length + 1}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function DeaccessionModal({ p, d, onClose }: { p: CasesProps; d: LegalDoc; onClose: () => void }) {
  const [to, setTo] = useState<"RESTRICTED" | "ARCHIVED">("RESTRICTED");
  const [reason, setReason] = useState("");
  return (
    <Modal onClose={onClose}>
      <ModalHead title="Deaccession record" sub="removes from active view — never deletes" onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim().length < 6) return;
          p.deaccessionDoc(d.id, to, reason.trim());
          onClose();
        }}
      >
        <div>
          <label className={labelCls}>Move to</label>
          <select className={inputCls} value={to} onChange={(e) => setTo(e.target.value as "RESTRICTED" | "ARCHIVED")}>
            <option value="RESTRICTED">RESTRICTED — court order required to view</option>
            <option value="ARCHIVED">ARCHIVED — legal-hold storage</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Reason (required, ledgered)</label>
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Witness protection direction u/s …" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink3">Deletion of legal records is not possible in LexVault.</p>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" kind="danger" disabled={reason.trim().length < 6}><IcArchive c="w-3.5 h-3.5" /> Deaccession</Btn>
        </div>
      </form>
    </Modal>
  );
}

function UploadModal({ p, c, onClose }: { p: CasesProps; c: CaseFile; onClose: () => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [type, setType] = useState(DOC_TYPES[0]);
  const [cls, setCls] = useState<LegalDoc["classification"]>("PUBLIC");
  const [note, setNote] = useState("Initial upload");
  const [body, setBody] = useState("");
  const [review, setReview] = useState(true);
  const valid = title.trim().length > 5 && body.trim().length >= 30;
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={t("act.upload")} sub={`${c.id} · v1 will be hashed & anchored to the version chain`} onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          p.uploadDoc(c.id, { title: title.trim(), type, classification: cls, note: note.trim(), body: body.trim(), submitForReview: review });
          onClose();
        }}
      >
        <div>
          <label className={labelCls}>Title</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Charge sheet u/s 173 CrPC" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              {DOC_TYPES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Access classification</label>
            <select className={inputCls} value={cls} onChange={(e) => setCls(e.target.value as LegalDoc["classification"])}>
              {["PUBLIC", "COURT", "INVESTIGATION", "PRIVILEGED", "RESTRICTED"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Change note</label>
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Document text</label>
          <textarea className={`${inputCls} min-h-[180px] font-mono text-[12.5px] leading-relaxed`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Full text of the record…" />
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-ink2 cursor-pointer">
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="w-4 h-4 accent-[#14263e]" />
          Submit for judicial approval (status → REVIEW)
        </label>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>{t("act.cancel")}</Btn>
          <Btn type="submit" disabled={!valid}><IcUpload c="w-3.5 h-3.5" /> {t("act.upload")}</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ================================================================== */
function EvidenceTab({ p, c }: { p: CasesProps; c: CaseFile }) {
  const t = useT();
  const items = p.evidence.filter((e) => e.caseId === c.id);
  const [evFor, setEvFor] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [note, setNote] = useState("");
  const canEv = canEvidenceEvent(p.user, c);
  return (
    <div className="space-y-4">
      <Panel title={`${t("tab.evidence")} · ${items.length}`} delay={80}>
        {items.length === 0 && <p className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">No exhibits on record</p>}
        <ul className="divide-y divide-line/70">
          {items.map((e) => (
            <li key={e.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11px] font-bold text-navy border border-navy/40 bg-navy/5 px-2 py-1">{e.id}</span>
                <p className="text-[14px] font-semibold text-ink flex-1">{e.item}</p>
                <span className="font-mono text-[10.5px] text-ink3">{e.location} · seized {fmtDate(e.seizedOn)}</span>
                {canEv && <Btn kind="ghost" onClick={() => setEvFor(evFor === e.id ? null : e.id)}><IcPlus c="w-3.5 h-3.5" /> custody event</Btn>}
              </div>
              <ol className="relative border-l-2 border-navy/25 ml-2 mt-3">
                {[...e.custody].reverse().map((ev, i) => (
                  <li key={i} className="pl-4 pb-3 relative last:pb-0">
                    <span className={`absolute -left-[5.5px] top-1.5 w-2.5 h-2.5 border-2 ${i === 0 ? "bg-crimson border-crimson" : "bg-paper border-navy"}`} />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink3">{fmtDateTime(ev.ts)}</p>
                    <p className="text-[13px] font-semibold text-ink mt-0.5">{ev.action}</p>
                    <p className="text-[12px] text-ink2">{ev.note} — {ev.actor}</p>
                  </li>
                ))}
              </ol>
              {evFor === e.id && (
                <form
                  className="mt-3 flex flex-wrap gap-2 border border-line bg-paper2/50 p-3"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    if (action.trim().length < 3 || note.trim().length < 5) return;
                    p.addEvidenceEvent(e.id, action.trim(), note.trim());
                    setAction(""); setNote(""); setEvFor(null);
                  }}
                >
                  <input className={`${inputCls} !w-52`} value={action} onChange={(ev) => setAction(ev.target.value)} placeholder="Action (e.g. Sent to FSL)" />
                  <input className={`${inputCls} flex-1 min-w-[200px]`} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Seals, memo no., receiving officer…" />
                  <Btn type="submit" kind="navy" disabled={action.trim().length < 3 || note.trim().length < 5}>Record</Btn>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function HearingsTab({ p, c }: { p: CasesProps; c: CaseFile }) {
  const t = useT();
  const [ts, setTs] = useState("");
  const [purpose, setPurpose] = useState("");
  const canSched = canScheduleHearing(p.user, c) && !caseReadOnly(c);
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Panel title={t("dash.upcoming")} delay={80}>
        <ul className="divide-y divide-line/70">
          {[...c.hearings].sort((a, b) => b.ts.localeCompare(a.ts)).map((h) => (
            <li key={h.id} className="px-4 py-3 flex items-center gap-3">
              <IcCalendar c="w-4 h-4 text-navy shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink leading-tight">{h.purpose}</p>
                <p className="font-mono text-[10.5px] text-ink3 mt-0.5">{fmtDateTime(h.ts)}</p>
              </div>
              <Chip tone={h.status === "SCHEDULED" ? "azure" : h.status === "COMPLETED" ? "green" : "amber"}>{h.status}</Chip>
            </li>
          ))}
          {c.hearings.length === 0 && <li className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
        </ul>
      </Panel>
      <div className="space-y-4">
        {canSched && (
          <Panel title="Schedule hearing" delay={140}>
            <form
              className="p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ts || purpose.trim().length < 4) return;
                p.scheduleHearing(c.id, new Date(ts).toISOString(), purpose.trim());
                setTs(""); setPurpose("");
              }}
            >
              <div>
                <label className={labelCls}>Date & time</label>
                <input type="datetime-local" className={inputCls} value={ts} onChange={(e) => setTs(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Purpose</label>
                <input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Cross-examination of IO" />
              </div>
              <Btn type="submit" kind="navy" disabled={!ts || purpose.trim().length < 4}><IcCalendar c="w-3.5 h-3.5" /> Fix date</Btn>
            </form>
          </Panel>
        )}
        <Panel title="Orders on record" delay={200}>
          <ul className="divide-y divide-line/70">
            {c.orders.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">{o.title}</p>
                <p className="font-mono text-[10.5px] text-ink3 mt-0.5">{o.id} · {o.by} · {fmtDate(o.issuedOn)}</p>
              </li>
            ))}
            {c.orders.length === 0 && <li className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function TimelineTab({ p, c }: { p: CasesProps; c: CaseFile }) {
  const t = useT();
  const events = useMemo(() => {
    const ev: { ts: string; title: string; sub: string; kind: string }[] = [];
    p.audit.filter((a) => a.caseId === c.id).forEach((a) => ev.push({ ts: a.ts, title: a.action.split("_").join(" "), sub: `${a.actor} · ${a.detail}`, kind: "audit" }));
    p.docs.filter((d) => d.caseId === c.id).forEach((d) => d.versions.forEach((v) => ev.push({ ts: v.ts, title: `${d.id} · v${v.v} created`, sub: `${v.author} · ${v.note}`, kind: "doc" })));
    c.hearings.forEach((h) => ev.push({ ts: h.ts, title: `Hearing · ${h.purpose}`, sub: h.status, kind: "hearing" }));
    c.transfers.forEach((tr) => ev.push({ ts: tr.initiatedOn, title: `Transfer ${tr.status.toLowerCase()}`, sub: `${COURTS.find((x) => x.id === tr.fromCourtId)?.name} → ${COURTS.find((x) => x.id === tr.toCourtId)?.name}`, kind: "transfer" }));
    if (c.closure) ev.push({ ts: c.closure.ts, title: c.closure.kind === "CLOSED" ? "Case closed" : "Case dismissed", sub: `${c.closure.by} · ${c.closure.orderRef}`, kind: "close" });
    return ev.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 40);
  }, [p.audit, p.docs, c]);
  const tone = (k: string) => (k === "audit" ? "border-navy/40" : k === "doc" ? "border-azure/50" : k === "hearing" ? "border-green/50" : k === "transfer" ? "border-plum/50" : "border-crimson/60");
  return (
    <Panel title={`${t("tab.timeline")} · derived from immutable events`} delay={80}>
      <ol className="relative border-l-2 border-line ml-5 my-4 mr-4">
        {events.map((e, i) => (
          <li key={i} className="pl-5 pb-5 relative last:pb-2">
            <span className={`absolute -left-[9px] top-1 w-4 h-4 border-2 bg-paper ${tone(e.kind)}`} />
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink3">{fmtDateTime(e.ts)}</p>
            <p className="text-[13.5px] font-semibold text-ink mt-0.5">{e.title}</p>
            <p className="text-[12px] text-ink2">{e.sub}</p>
          </li>
        ))}
        {events.length === 0 && <li className="pl-5 pb-2 font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
      </ol>
    </Panel>
  );
}

function TransfersTab({ p, c, onInitiate }: { p: CasesProps; c: CaseFile; onInitiate: () => void }) {
  const t = useT();
  return (
    <Panel
      title={`${t("tab.transfers")} · ${c.transfers.length}`}
      delay={80}
      right={canInitiateTransfer(p.user, c) && p.courts.length > 1 ? <Btn kind="ghost" onClick={onInitiate}><IcSend c="w-3.5 h-3.5" /> {t("act.transfer")}</Btn> : undefined}
    >
      <ul className="divide-y divide-line/70">
        {c.transfers.map((tr) => (
          <li key={tr.id} className="px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 flex-1 min-w-[280px]">
                <div className="border border-line bg-paper2/60 px-3 py-2.5">
                  <p className={labelCls}>From</p>
                  <p className="text-[12.5px] font-semibold text-ink leading-tight">{COURTS.find((x) => x.id === tr.fromCourtId)?.name}</p>
                </div>
                <IcSend c="w-5 h-5 text-plum" />
                <div className="border border-line bg-paper2/60 px-3 py-2.5">
                  <p className={labelCls}>To</p>
                  <p className="text-[12.5px] font-semibold text-ink leading-tight">{COURTS.find((x) => x.id === tr.toCourtId)?.name}</p>
                </div>
              </div>
              <Chip tone={tr.status === "ACCEPTED" ? "green" : tr.status === "REJECTED" ? "red" : "plum"}>{tr.status}</Chip>
            </div>
            <p className="font-mono text-[10.5px] text-ink3 mt-2.5">
              {tr.id} · initiated {tr.initiatedBy} ({fmtDate(tr.initiatedOn)}) · ref {tr.orderRef}
              {tr.approvedBy && <> · approved {tr.approvedBy} ({fmtDate(tr.approvedOn!)})</>}
            </p>
            <p className="text-[12.5px] text-ink2 mt-1">Grounds: {tr.reason}</p>
            {tr.status === "REQUESTED" && canApproveTransfer(p.user) && (
              <div className="flex gap-2 mt-3">
                <Btn kind="green" onClick={() => p.decideTransfer(c.id, tr.id, true)}><IcCheck c="w-3.5 h-3.5" /> Approve & accept</Btn>
                <Btn kind="danger" onClick={() => p.decideTransfer(c.id, tr.id, false)}><IcX c="w-3.5 h-3.5" /> Reject</Btn>
              </div>
            )}
          </li>
        ))}
        {c.transfers.length === 0 && (
          <li className="px-4 py-12 text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink3">No transfer history</p>
            <p className="text-[12px] text-ink3 mt-1">Case ID, documents, versions, evidence & ledger travel intact on transfer.</p>
          </li>
        )}
      </ul>
    </Panel>
  );
}

function TransferModal({ p, c, onClose }: { p: CasesProps; c: CaseFile; onClose: () => void }) {
  const t = useT();
  const targets = COURTS.filter((x) => x.id !== c.courtId);
  const [to, setTo] = useState(targets[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const valid = !!to && reason.trim().length > 8 && orderRef.trim().length > 4;
  return (
    <Modal onClose={onClose}>
      <ModalHead title={t("act.transfer")} sub={`${c.id} · record travels intact`} onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          p.initiateTransfer(c.id, to, reason.trim(), orderRef.trim());
          onClose();
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="border border-line bg-paper2/60 px-3 py-2.5">
            <p className={labelCls}>From</p>
            <p className="text-[12.5px] font-semibold text-ink leading-tight">{COURTS.find((x) => x.id === c.courtId)?.name}</p>
          </div>
          <IcSend c="w-5 h-5 text-plum" />
          <div>
            <label className={labelCls}>To</label>
            <select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)}>
              {targets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Grounds for transfer</label>
          <textarea className={`${inputCls} min-h-[80px]`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Docket congestion; convenience of parties…" />
        </div>
        <div>
          <label className={labelCls}>Order / reference number</label>
          <input className={inputCls} value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="ORD-2026-…" />
        </div>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>{t("act.cancel")}</Btn>
          <Btn type="submit" disabled={!valid}><IcSend c="w-3.5 h-3.5" /> Request transfer</Btn>
        </div>
      </form>
    </Modal>
  );
}

function CloseDismissModal({ p, c, kind, onClose }: { p: CasesProps; c: CaseFile; kind: "CLOSED" | "DISMISSED"; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [signed, setSigned] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const valid = reason.trim().length > 8 && orderRef.trim().length > 4 && confirm;
  return (
    <Modal onClose={onClose}>
      <ModalHead title={kind === "CLOSED" ? t("act.closeCase") : t("act.dismissCase")} sub={`${c.id} · record preserved read-only — nothing deleted`} onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          p.closeCase(c.id, kind, reason.trim(), orderRef.trim(), signed);
          onClose();
        }}
      >
        <div>
          <label className={labelCls}>Reason (required, ledgered)</label>
          <textarea className={`${inputCls} min-h-[80px]`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={kind === "CLOSED" ? "e.g. Conviction recorded; sentence directed…" : "e.g. Not maintainable; statutory remedy available…"} />
        </div>
        <div>
          <label className={labelCls}>Order / judgment reference</label>
          <input className={inputCls} value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="ORD-2026-…" />
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-ink2 cursor-pointer">
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} className="w-4 h-4 accent-[#14263e]" />
          <span className="inline-flex items-center gap-1.5"><IcSign c="w-3.5 h-3.5 text-navy" /> Affix digital signature (RSA-4096 · e-Sign DSS)</span>
        </label>
        <label className="flex items-start gap-2 text-[12.5px] text-ink2 cursor-pointer border border-line bg-paper2/60 px-3 py-2.5">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#b3271e]" />
          I confirm this action is legally warranted and understand the case becomes read-only; documents and history are preserved permanently.
        </label>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>{t("act.cancel")}</Btn>
          <Btn type="submit" kind={kind === "CLOSED" ? "navy" : "primary"} disabled={!valid}>
            <IcGavel c="w-3.5 h-3.5" /> {kind === "CLOSED" ? t("act.closeCase") : t("act.dismissCase")}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function CaseAuditTab({ p, c }: { p: CasesProps; c: CaseFile }) {
  const t = useT();
  const links = p.audit.filter((a) => a.caseId === c.id).sort((a, b) => b.seq - a.seq);
  return (
    <Panel title={`${t("tab.caseaudit")} · ${links.length}`} delay={80} right={<Chip tone="navy">append-only</Chip>}>
      <ul className="divide-y divide-line/70">
        {links.map((a) => (
          <li key={a.seq} className="px-4 py-2.5 flex items-center gap-3">
            <span className="font-mono text-[10px] text-steel w-10 shrink-0">#{String(a.seq).padStart(3, "0")}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-ink leading-snug">
                <span className="font-semibold">{a.actor}</span> <span className="font-mono text-[9.5px] uppercase text-steel">{a.role}</span> · {a.action.split("_").join(" ").toLowerCase()}
              </p>
              <p className="font-mono text-[10px] text-ink3 truncate">{a.detail}{a.docId !== "—" ? ` · ${a.docId}` : ""}</p>
            </div>
            <span className="font-mono text-[10px] text-ink3 whitespace-nowrap">{timeAgo(a.ts)}</span>
          </li>
        ))}
        {links.length === 0 && <li className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">—</li>}
      </ul>
    </Panel>
  );
}
