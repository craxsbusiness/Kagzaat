import { useMemo, useState } from "react";
import type { CaseFile, Court, LegalDoc, User } from "../data";
import { DOC_TYPES, canSeeCase, canSeeDoc } from "../data";
import { fmtDate } from "../lib";
import { Btn, CaseStatusBadge, Chip, DocClassBadge, DocStatusStamp, Panel, useToast } from "../ui";
import { useT } from "../i18n";
import { IcChevR, IcEyeOff, IcFile, IcFolder, IcScan, IcSearch } from "../icons";

interface Props {
  user: User;
  users: User[];
  courts: Court[];
  cases: CaseFile[];
  docs: LegalDoc[];
  onOpenCase: (id: string, tab?: string) => void;
  logSearch: (q: string, hits: number) => void;
}

let COURTS: Court[] = [];

/* semantic expansion — a nod to AI-assisted retrieval */
const SYNONYMS: Record<string, string[]> = {
  vehicle: ["motor", "accident", "skid", "mechanical"],
  forensic: ["fsl", "examination", "laboratory", "toxicology"],
  fraud: ["wire", "transfer", "mule", "bank"],
  cheque: ["138", "dishonour", "ni act"],
  theft: ["cartons", "godown", "recovery"],
  witness: ["161", "statement", "cross-examination"],
};

export default function SearchView(p: Props) {
  COURTS = p.courts;
  const t = useT();
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("ALL");
  const [fCourt, setFCourt] = useState("ALL");
  const [ocr, setOcr] = useState(true);
  const [searched, setSearched] = useState(false);
  const toast = useToast();

  const expand = (raw: string): string[] => {
    const words = raw.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
    const out = new Set(words);
    words.forEach((w) => {
      if (SYNONYMS[w]) SYNONYMS[w].forEach((s) => out.add(s));
      Object.entries(SYNONYMS).forEach(([k, vs]) => {
        if (vs.includes(w)) out.add(k);
      });
    });
    return Array.from(out);
  };

  const results = useMemo(() => {
    const terms = expand(q);
    const match = (hay: string) => terms.every((tt) => hay.toLowerCase().includes(tt));

    const caseHits: { c: CaseFile }[] = [];
    const docHits: { d: LegalDoc; c: CaseFile }[] = [];
    let suppressed = 0;

    p.cases.forEach((c) => {
      const sees = canSeeCase(p.user, c);
      const judge = p.users.find((u) => u.id === c.judgeId)?.name ?? "";
      const court = COURTS.find((x) => x.id === c.courtId)?.name ?? "";
      const partyNames = c.parties.map((x) => p.users.find((u) => u.id === x.userId)?.name ?? "").join(" ");
      const lawyerNames = c.lawyerIds.map((x) => p.users.find((u) => u.id === x)?.name ?? "").join(" ");
      const ioName = p.users.find((u) => u.id === c.ioId)?.name ?? "";
      const hay = [c.id, c.cno, c.title, c.firNumber ?? "", court, judge, partyNames, lawyerNames, ioName, c.stationId ?? "", ...c.tags].join(" § ");
      if (terms.length === 0 || match(hay)) {
        if (sees) caseHits.push({ c });
        else suppressed++;
      }
    });

    p.docs.forEach((d) => {
      const c = p.cases.find((x) => x.id === d.caseId);
      if (!c || terms.length === 0) return;
      if (fType !== "ALL" && d.type !== fType) return;
      if (fCourt !== "ALL" && c.courtId !== fCourt) return;
      const hayParts = [d.id, d.title, d.type, c.id, c.title, ...d.versions.map((v) => v.note)];
      if (ocr) d.versions.forEach((v) => hayParts.push(v.body));
      if (match(hayParts.join(" § "))) {
        if (canSeeDoc(p.user, c, d)) docHits.push({ d, c });
        else suppressed++;
      }
    });

    return { caseHits, docHits, suppressed };
  }, [q, fType, fCourt, ocr, p.cases, p.docs, p.users, p.user]);

  const run = () => {
    if (!q.trim()) return;
    setSearched(true);
    p.logSearch(q.trim(), results.caseHits.length + results.docHits.length);
    toast("info", "Search executed under your authorization", "Results beyond your access are suppressed by the gateway.");
  };

  return (
    <div className="space-y-4">
      <div className="rise">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink3">{t("search.kicker")}</p>
        <h1 className="font-display font-semibold uppercase text-[30px] leading-none tracking-wide text-ink mt-1">{t("search.title")}</h1>
      </div>

      <Panel delay={60}>
        <form
          className="p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3"><IcSearch c="w-4 h-4" /></span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search.ph")}
                className="w-full bg-paper border border-line pl-9 pr-3 py-2.5 text-[14px] focus:outline-none focus:border-navy placeholder:text-ink3/70 transition-colors"
              />
            </div>
            <Btn type="submit" className="!py-2.5"><IcSearch c="w-3.5 h-3.5" /> {t("act.search")}</Btn>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <select value={fType} onChange={(e) => setFType(e.target.value)} className="bg-paper border border-line text-[11px] font-mono uppercase px-2 py-2 focus:outline-none focus:border-navy" aria-label="Document type filter">
              <option value="ALL">Type · All</option>
              {DOC_TYPES.map((tt) => <option key={tt}>{tt}</option>)}
            </select>
            <select value={fCourt} onChange={(e) => setFCourt(e.target.value)} className="bg-paper border border-line text-[11px] font-mono uppercase px-2 py-2 focus:outline-none focus:border-navy" aria-label="Court filter">
              <option value="ALL">Court · All</option>
              {COURTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-[12.5px] text-ink2 cursor-pointer ml-auto">
              <input type="checkbox" checked={ocr} onChange={(e) => setOcr(e.target.checked)} className="accent-navy w-4 h-4" />
              <span className="inline-flex items-center gap-1.5"><IcScan c="w-3.5 h-3.5 text-navy" /> {t("search.ocr")}</span>
            </label>
          </div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink3 mt-2.5">{t("search.semantic")}</p>
        </form>
      </Panel>

      {searched && (
        <>
          <div className="rise grid md:grid-cols-2 gap-4 items-start" style={{ animationDelay: "80ms" }}>
            <Panel title={`${t("search.cases")} · ${results.caseHits.length} ${t("search.found")}`}>
              <ul className="divide-y divide-line/70">
                {results.caseHits.map(({ c }) => (
                  <li key={c.id}>
                    <button onClick={() => p.onOpenCase(c.id)} className="w-full px-4 py-3 text-left hover:bg-navy/[0.04] transition-colors group flex items-center gap-3">
                      <span className="text-navy"><IcFolder c="w-4 h-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[10.5px] text-steel font-semibold">{c.id}</span>
                        <span className="block text-[13px] font-semibold text-ink group-hover:text-navy transition-colors leading-tight">{c.title}</span>
                        <span className="block font-mono text-[9.5px] text-ink3 mt-0.5">{COURTS.find((x) => x.id === c.courtId)?.name} · filed {fmtDate(c.filedOn)}</span>
                      </span>
                      <CaseStatusBadge status={c.status} small />
                      <IcChevR c="w-3.5 h-3.5 text-ink3 group-hover:text-crimson transition-colors" />
                    </button>
                  </li>
                ))}
                {results.caseHits.length === 0 && (
                  <li className="px-4 py-8 text-center font-mono text-[10.5px] uppercase tracking-widest text-ink3">—</li>
                )}
              </ul>
            </Panel>

            <Panel title={`${t("search.docs")} · ${results.docHits.length} ${t("search.found")}`}>
              <ul className="divide-y divide-line/70">
                {results.docHits.map(({ d, c }) => (
                  <li key={d.id}>
                    <button onClick={() => p.onOpenCase(c.id, "documents")} className="w-full px-4 py-3 text-left hover:bg-navy/[0.04] transition-colors group flex items-center gap-3">
                      <span className="text-navy"><IcFile c="w-4 h-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink group-hover:text-navy transition-colors leading-tight">{d.title}</span>
                        <span className="block font-mono text-[9.5px] text-ink3 mt-0.5">{d.id} · {c.id} · v{d.versions.length}</span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <DocClassBadge level={d.classification} small />
                        <DocStatusStamp status={d.status} small />
                      </span>
                    </button>
                  </li>
                ))}
                {results.docHits.length === 0 && (
                  <li className="px-4 py-8 text-center font-mono text-[10.5px] uppercase tracking-widest text-ink3">—</li>
                )}
              </ul>
            </Panel>
          </div>

          <div className="rise border border-line bg-card px-4 py-3 flex items-center gap-3" style={{ animationDelay: "140ms" }}>
            <span className="text-ink2"><IcEyeOff c="w-4 h-4" /></span>
            <p className="text-[12.5px] text-ink2">
              {t("search.suppressed")}
            </p>
            <Chip tone="red">403 · not disclosed</Chip>
          </div>
        </>
      )}

      {!searched && (
        <div className="rise grid sm:grid-cols-3 gap-3">
          {[
            { t: "By identifier", d: "Case ID, case number, FIR number, document ID", ex: "CASE-2026" },
            { t: "By people & places", d: "Party name, judge, counsel, police station, court", ex: "Chauhan · Mehrauli" },
            { t: "By meaning", d: "Semantic expansion maps phrases to indexed terms & OCR text", ex: "vehicle examination" },
          ].map((x, i) => (
            <button
              key={i}
              onClick={() => { setQ(x.ex); setSearched(false); }}
              className="text-left border border-line bg-card px-4 py-3.5 hover:border-navy hover:-translate-y-0.5 transition-all"
            >
              <p className="font-display font-semibold uppercase tracking-[0.12em] text-[12.5px] text-ink">{x.t}</p>
              <p className="text-[12px] text-ink2 leading-snug mt-1">{x.d}</p>
              <p className="font-mono text-[10px] text-crimson mt-2">“{x.ex}”</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
