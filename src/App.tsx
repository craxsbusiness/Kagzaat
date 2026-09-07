import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChainLink } from "./lib";
import { fmtClock, makeLink, timeAgo, uid, useLocalState, useNow, verifyChain, versionHash } from "./lib";
import type { CaseFile, Court, EvidenceItem, LegalDoc, LoginEvent, Notice, RoleId, SecurityEvent, TransferRec, User } from "./data";
import {
  COURTS as COURTS_SEED, ROLE_BANNER, ROLE_LABEL, SEED_AUDIT, SEED_CASES, SEED_DOCUMENTS, SEED_EVIDENCE,
  SEED_LOGINS, SEED_NOTICES, SEED_SECURITY, USERS, canDownload, canSeeCase, canSeeDoc, canUpload, keyFingerprint,
} from "./data";
import { hashPassword, hashSecret } from "./lib";
import { discardSupabaseSession, isSupabaseConfigured, sendPersonCodeEmail } from "./supabase";
import { fetchRegistryRows, openRegistryChannel, syncAvailable, upsertRegistryRow, type RegistryRow, type SyncKey } from "./supaSync";
import { Btn, Chip, ToastProvider, useFeed, useToast } from "./ui";
import { PrefsProvider, usePrefs, useT } from "./i18n";
import {
  IcChain, IcCheck, IcCheckSeal, IcClock, IcCourt, IcFolder, IcKey, IcLogout,
  IcMenu, IcPulse, IcSearch, IcShield, IcUsers, IcX,
} from "./icons";
import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import CasesView from "./views/Cases";
import AuditTrail from "./views/AuditTrail";
import AdminPanel from "./views/AdminPanel";
import SearchView from "./views/SearchView";
import CreatePartyAccount from "./views/CreatePartyAccount";
import Landing from "./components/Landing";
import AccessCluster from "./components/AccessCluster";

type Nav = "console" | "cases" | "search" | "audit" | "admin" | "createParty";

interface Session {
  userId: string;
  exp: number;
  device: string;
  ip: string;
}

const BANNER_BG: Record<string, string> = {
  crimson: "bg-crimson", rust: "bg-rust", amber: "bg-amber", steel: "bg-steel",
  plum: "bg-plum", green: "bg-green", azure: "bg-azure",
};

function Portal() {
  const toast = useToast();
  const prefs = usePrefs();
  const t = prefs.t;

  /* ---------------- persistent state (starts EMPTY) ---------------- */
  const [session, setSession] = useLocalState<Session | null>("lv4:session", null);
  const [users, setUsers] = useLocalState<User[]>("lv4:users", []);
  const [courts, setCourts] = useLocalState<Court[]>("lv4:courts", []);
  const [cases, setCases] = useLocalState<CaseFile[]>("lv4:cases", []);
  const [docs, setDocs] = useLocalState<LegalDoc[]>("lv4:docs", []);
  const [evidence, setEvidence] = useLocalState<EvidenceItem[]>("lv4:evidence", []);
  const [audit, setAudit] = useLocalState<ChainLink[]>("lv4:audit", []);
  const [logins, setLogins] = useLocalState<LoginEvent[]>("lv4:logins", []);
  const [security, setSecurity] = useLocalState<SecurityEvent[]>("lv4:security", []);
  const [notices, setNotices] = useLocalState<Notice[]>("lv4:notices", []);

  const COURTS = courts;

  /* ---------------- ui state ---------------- */
  const [nav, setNav] = useState<Nav>("console");
  const [selCase, setSelCase] = useState<string | null>(null);
  const [selTab, setSelTab] = useState("documents");
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gateMode, setGateMode] = useState<"landing" | "signin" | "signup">("landing");
  const [magicReturnId, setMagicReturnId] = useState<string | null>(null);

  /* a clicked email verification link lands here with #access_token=… —
     complete factor 2 for the pending principal automatically */
  useEffect(() => {
    const h = window.location.hash;
    if (h.includes("access_token=")) {
      const pendingId = localStorage.getItem("lv4:otp-return");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (pendingId) {
        localStorage.removeItem("lv4:otp-return");
        setGateMode("signin");
        setMagicReturnId(pendingId);
        void discardSupabaseSession();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const feed = useFeed();
  const [flash, setFlash] = useState(false);
  const seenFeedId = useRef<string | null>(null);

  /* quiet perceptible feedback — the menu button pulses when something lands in the feed */
  useEffect(() => {
    if (feed.lastId && feed.lastId !== seenFeedId.current) {
      seenFeedId.current = feed.lastId;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1900);
      return () => clearTimeout(id);
    }
  }, [feed.lastId]);
  const [sideOpen, setSideOpen] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);

  const user = useMemo(() => (session ? users.find((u) => u.id === session.userId) ?? null : null), [session, users]);
  const now = useNow(1000);

  /* ---------------- ledger ---------------- */
  const log = useCallback(
    (action: string, opts: { detail?: string; caseId?: string; docId?: string; actor?: string; role?: string; ip?: string } = {}) => {
      setAudit((prev) => {
        const sorted = [...prev].sort((a, b) => a.seq - b.seq);
        const last = sorted[sorted.length - 1];
        const link = makeLink(last, {
          actor: opts.actor ?? user?.name ?? "System",
          role: opts.role ?? (user ? ROLE_LABEL[user.role] : "SYSTEM"),
          action,
          caseId: opts.caseId,
          docId: opts.docId,
          detail: opts.detail ?? "",
          ip: opts.ip ?? session?.ip ?? "127.0.0.1",
        });
        return [...prev.slice(-499), link];
      });
      /* short-lived token: renew on activity */
      if (session && session.exp - Date.now() < 12 * 60 * 1000) {
        setSession((s) => (s ? { ...s, exp: Date.now() + 15 * 60 * 1000 } : s));
      }
    },
    [setAudit, user, session, setSession]
  );

  const notify = useCallback(
    (forUserId: string, kind: Notice["kind"], text: string, caseId?: string) => {
      setNotices((prev) => [{ id: uid("N"), forUserId, ts: new Date().toISOString(), kind, text, read: false, caseId }, ...prev].slice(0, 120));
    },
    [setNotices]
  );

  const pushSecurity = useCallback(
    (severity: SecurityEvent["severity"], kind: string, detail: string, userId?: string) => {
      setSecurity((prev) => [{ id: uid("SEC"), ts: new Date().toISOString(), severity, kind, detail, userId }, ...prev].slice(0, 60));
    },
    [setSecurity]
  );

  const pushLogin = useCallback(
    (ev: Omit<LoginEvent, "id" | "ts">) => {
      setLogins((prev) => [{ ...ev, id: uid("LG"), ts: new Date().toISOString() }, ...prev].slice(0, 200));
    },
    [setLogins]
  );

  /* ---------------- session lifecycle ---------------- */
  useEffect(() => {
    if (!session) return;
    if (Date.now() > session.exp) {
      const u = users.find((x) => x.id === session.userId);
      if (u) {
        pushLogin({ userId: u.id, userName: u.name, kind: "EXPIRED", device: session.device, ip: session.ip, location: "Gateway", note: "Session expired after 15 minutes · re-authentication required" });
        setAudit((prev) => [...prev.slice(-499), makeLink([...prev].sort((a, b) => a.seq - b.seq).pop(), { actor: u.name, role: ROLE_LABEL[u.role], action: "SESSION_EXPIRED", detail: "Short-lived token lapsed" })]);
      }
      setSession(null);
      setExpiredNotice("Your session expired. Please sign in again.");
    }
  }, [now, session, users, pushLogin, setAudit, setSession]);

  /* ---------------- auth ---------------- */
  const onLogin = (userId: string, device: string, ip: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    setSession({ userId, exp: Date.now() + 15 * 60 * 1000, device, ip });
    setExpiredNotice(null);
    pushLogin({ userId: u.id, userName: u.name, kind: "SUCCESS", device, ip, location: "Gateway", note: "Session established · token 15 min · rotation on activity" });
    log("LOGIN", { detail: `Session established · ${device} · ip ${ip} · MFA verified`, actor: u.name, role: ROLE_LABEL[u.role], ip });
    toast("success", `Signed in — ${u.name}`, `${ROLE_LABEL[u.role]} · the vault is re-graded to your authorization.`);
  };

  const logout = () => {
    if (session && user) {
      pushLogin({ userId: user.id, userName: user.name, kind: "LOGOUT", device: session.device, ip: session.ip, location: "Gateway", note: "Signed out by user" });
      log("LOGOUT", { detail: "Signed out · token revoked" });
    }
    setSession(null);
    setSelCase(null);
    setForbidden(null);
  };

  /* ---------------- authorization gateway ---------------- */
  const attemptOpen = (id: string) => {
    const c = cases.find((x) => x.id === id.toUpperCase() || x.id === id);
    if (!user) return;
    if (!c || !canSeeCase(user, c)) {
      log("ACCESS_DENIED", { detail: `Attempt on ${id.toUpperCase()} — existence not disclosed · role ${ROLE_LABEL[user.role]}` });
      if (!c) pushSecurity("WARN", "ACCESS_DENIED_PATTERN", `${user.name} attempted an unknown/unauthorized case identifier (${id.toUpperCase()}) — suppressed`, user.id);
      setForbidden(id.toUpperCase());
      toast("error", "403 — Forbidden", "Whether that record exists is not disclosed. The attempt is ledgered.");
      return;
    }
    setForbidden(null);
    setSelCase(c.id);
    setSelTab("documents");
    log("CASE_VIEWED", { caseId: c.id, detail: "Case file opened under authorization" });
  };

  /* ---------------- document actions ---------------- */
  const uploadDoc: Parameters<typeof CasesView>[0]["uploadDoc"] = (caseId, pp) => {
    if (!user) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c || !canUpload(user, c)) return;
    const seq = docs.filter((d) => d.caseId === caseId).length + 1;
    const id = `DOC-${caseId.split("-").pop()}-${String(seq).padStart(2, "0")}`;
    const nowIso = new Date().toISOString();
    const hash = versionHash(id, 1, pp.body, pp.note, "0".repeat(64));
    const doc: LegalDoc = {
      id, caseId, type: pp.type, title: pp.title, classification: pp.classification,
      status: pp.submitForReview ? "REVIEW" : "DRAFT",
      uploadedBy: user.name, createdAt: nowIso,
      sizeKB: Math.max(8, Math.round(pp.body.length / 9)),
      versions: [{ v: 1, ts: nowIso, author: user.name, note: pp.note, body: pp.body, status: pp.submitForReview ? "REVIEW" : "DRAFT", hash, prevHash: "0".repeat(64) }],
      accessCount: 0,
    };
    setDocs((prev) => [doc, ...prev]);
    log("DOC_UPLOADED", { caseId, docId: id, detail: `${pp.type} · v1 · SHA-256 anchored · class ${pp.classification}` });
    if (pp.submitForReview) c.lawyerIds.concat(c.judgeId).slice(0, 2).forEach((uidX) => notify(uidX, "DOC", `${id} submitted for approval — ${pp.title}`, caseId));
    toast("success", "Document uploaded", `${id} · Version 1 anchored with its SHA-256 digest.`);
  };

  const editDoc = (docId: string, note: string, body: string) => {
    if (!user) return;
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const v = d.versions.length + 1;
        const prevHash = d.versions[d.versions.length - 1].hash;
        const hash = versionHash(docId, v, body, note, prevHash);
        return {
          ...d,
          status: d.status === "APPROVED" || d.status === "SIGNED" ? "REVIEW" : d.status,
          versions: [...d.versions.map((x) => (x.status === "REVIEW" || x.status === "DRAFT" ? { ...x, status: "SUPERSEDED" as const } : x)), { v, ts: new Date().toISOString(), author: user.name, note, body, status: "DRAFT" as const, hash, prevHash }],
        };
      })
    );
    const d = docs.find((x) => x.id === docId);
    log("DOC_EDITED", { caseId: d?.caseId, docId, detail: `v${(d?.versions.length ?? 1) + 1} created · previous versions preserved` });
    log("VERSION_CREATED", { caseId: d?.caseId, docId, detail: `New digest chained to v${d?.versions.length} · ${note}` });
    toast("success", `Version v${(d?.versions.length ?? 1) + 1} created`, "The original is untouched — the chain now has one more link.");
  };

  const approveDoc = (docId: string) => {
    if (!user) return;
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, status: "APPROVED", versions: d.versions.map((v, i) => (i === d.versions.length - 1 ? { ...v, status: "APPROVED" as const } : v)) } : d)));
    const d = docs.find((x) => x.id === docId);
    log("DOC_APPROVED", { caseId: d?.caseId, docId, detail: `Approved by ${user.name}` });
    if (d) notify(d.uploadedBy === user.name ? d.uploadedBy : users.find((u) => u.name === d.uploadedBy)?.id ?? "", "DOC", `${docId} approved.`, d.caseId);
    toast("success", "Document approved", "Ready for digital signature.");
  };

  const signDoc = (docId: string) => {
    if (!user) return;
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              status: "SIGNED",
              versions: d.versions.map((v, i) =>
                i === d.versions.length - 1 ? { ...v, status: "SIGNED" as const, signature: { name: user.name, role: ROLE_LABEL[user.role], ts: new Date().toISOString(), algo: "RSA-4096 · e-Sign DSS" } } : v
              ),
            }
          : d
      )
    );
    const d = docs.find((x) => x.id === docId);
    log("DOC_SIGNED", { caseId: d?.caseId, docId, detail: `Digitally signed by ${user.name} · locked against ordinary editing` });
    toast("success", "Digitally signed", "The signed version is now locked. Changes require a new revision.");
  };

  const downloadDoc = (docId: string) => {
    if (!user) return;
    const d = docs.find((x) => x.id === docId);
    const c = d ? cases.find((x) => x.id === d.caseId) : null;
    if (!d || !c || !canDownload(user, c, d)) return;
    const wm = `WM-${session?.userId.slice(-4).toUpperCase() ?? "0000"}-${Math.floor(1000 + Math.random() * 8999)}`;
    log("DOC_DOWNLOADED", { caseId: c.id, docId, detail: `Watermarked copy issued · ${wm} · time-limited link` });
    toast("success", "Download issued", `Certified copy · watermark ${wm} · traceable to your session.`);
  };

  const viewDoc = (docId: string) => {
    if (!user) return;
    const d = docs.find((x) => x.id === docId);
    if (!d) return;
    setDocs((prev) => prev.map((x) => (x.id === docId ? { ...x, accessCount: x.accessCount + 1 } : x)));
    log("DOC_VIEWED", { caseId: d.caseId, docId, detail: `Decrypted read session · v${d.versions.length}` });
  };

  const onVerified = (docId: string, ok: boolean) => {
    if (!user) return;
    const d = docs.find((x) => x.id === docId);
    if (ok) {
      log("CHAIN_VERIFIED", { caseId: d?.caseId, docId, detail: "Version-chain recomputation · MATCH" });
    } else {
      log("INTEGRITY_ALERT", { caseId: d?.caseId, docId, detail: "Digest MISMATCH — suspected tampering · record quarantined" });
      pushSecurity("CRITICAL", "INTEGRITY_FAILURE", `${docId}: stored digest disagrees with recomputed hash — possible modification outside the system`, user.id);
    }
  };

  const tamperDrill = (docId: string) => {
    setDocs((prev) =>
      prev.map((x) => {
        if (x.id !== docId) return x;
        const latest = x.versions[x.versions.length - 1];
        const flipped = (latest.hash[0] === "a" ? "b" : "a") + latest.hash.slice(1);
        return { ...x, tampered: true, versions: [...x.versions.slice(0, -1), { ...latest, hash: flipped }] };
      })
    );
  };

  const restoreDoc = (docId: string) => {
    if (!user) return;
    setDocs((prev) =>
      prev.map((x) => {
        if (x.id !== docId) return x;
        const latest = x.versions[x.versions.length - 1];
        const rebuilt = versionHash(docId, latest.v, latest.body, latest.note, latest.prevHash);
        return { ...x, tampered: false, versions: [...x.versions.slice(0, -1), { ...latest, hash: rebuilt }] };
      })
    );
    const d = docs.find((x) => x.id === docId);
    log("DOC_EDITED", { caseId: d?.caseId, docId, detail: "Restored from WORM replica · digest recomputed & concordant" });
  };

  const deaccessionDoc = (docId: string, to: "RESTRICTED" | "ARCHIVED", reason: string) => {
    if (!user) return;
    setDocs((prev) => prev.map((x) => (x.id === docId ? { ...x, status: to, deaccessioned: { ts: new Date().toISOString(), by: user.name, to, reason } } : x)));
    const d = docs.find((x) => x.id === docId);
    log("DOC_DEACCESSIONED", { caseId: d?.caseId, docId, detail: `Moved to ${to} · ${reason} · never deleted` });
    toast("info", `Record ${to.toLowerCase()}`, "Removed from active view; preserved under legal hold.");
  };

  /* ---------------- case actions ---------------- */
  const addEvidenceEvent = (evId: string, action: string, note: string) => {
    if (!user) return;
    setEvidence((prev) => prev.map((e) => (e.id === evId ? { ...e, custody: [...e.custody, { ts: new Date().toISOString(), actor: user.name, action, note }] } : e)));
    const e = evidence.find((x) => x.id === evId);
    log("EVIDENCE_TRANSFERRED", { caseId: e?.caseId, docId: evId, detail: `${action} · ${note}` });
    toast("success", "Custody event recorded", `${evId} · chain of custody extended.`);
  };

  const scheduleHearing = (caseId: string, tsIso: string, purpose: string) => {
    if (!user) return;
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, hearings: [...c.hearings, { id: uid("H"), ts: tsIso, purpose, status: "SCHEDULED" as const }] } : c)));
    const c = cases.find((x) => x.id === caseId);
    log("HEARING_SCHEDULED", { caseId, detail: `${purpose} · fixed for ${new Date(tsIso).toLocaleString()}` });
    if (c) [...c.parties.map((pp) => pp.userId), ...c.lawyerIds].forEach((uidX) => notify(uidX, "HEARING", `Hearing in ${caseId}: ${purpose}.`, caseId));
    toast("success", "Hearing fixed", "Parties and counsel notified.");
  };

  const initiateTransfer = (caseId: string, toCourtId: string, reason: string, orderRef: string) => {
    if (!user) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c) return;
    const trfId = uid("TRF");
    setCases((prev) =>
      prev.map((x) =>
        x.id === caseId
          ? { ...x, transfers: [...x.transfers, { id: trfId, fromCourtId: x.courtId, toCourtId, initiatedBy: user.name, initiatedOn: new Date().toISOString(), reason, orderRef, status: "REQUESTED" as const }] }
          : x
      )
    );
    log("CASE_TRANSFER_REQUESTED", { caseId, detail: `→ ${COURTS.find((x) => x.id === toCourtId)?.name} · ${reason} · ref ${orderRef}` });
    users.filter((u) => u.role === "ADMIN").forEach((a) => notify(a.id, "TRANSFER", `Transfer request ${trfId} for ${caseId} awaits registry approval.`, caseId));
    toast("info", "Transfer requested", "Pending registry approval — the record stays put meanwhile.");
  };

  const decideTransfer = (caseId: string, trfId: string, approve: boolean) => {
    if (!user) return;
    const c = cases.find((x) => x.id === caseId);
    const trf = c?.transfers.find((x) => x.id === trfId);
    if (!c || !trf) return;
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const transfers = x.transfers.map((tt) => (tt.id === trfId ? { ...tt, status: (approve ? "ACCEPTED" : "REJECTED") as TransferRec["status"], approvedBy: user.name, approvedOn: new Date().toISOString() } : tt));
        return approve ? { ...x, transfers, prevCourtId: x.courtId, courtId: trf.toCourtId, status: x.status } : { ...x, transfers };
      })
    );
    if (approve) {
      log("CASE_TRANSFER_APPROVED", { caseId, detail: `${trfId} accepted · ${COURTS.find((x) => x.id === trf.fromCourtId)?.name} → ${COURTS.find((x) => x.id === trf.toCourtId)?.name} · ownership moved, record intact` });
      [c.judgeId, ...c.parties.map((pp) => pp.userId), ...c.lawyerIds].forEach((uidX) => notify(uidX, "TRANSFER", `${caseId} transferred to ${COURTS.find((x) => x.id === trf.toCourtId)?.name}.`, caseId));
    } else {
      log("CASE_TRANSFER_REJECTED", { caseId, detail: `${trfId} rejected by ${user.name}` });
    }
  };

  const closeCase = (caseId: string, kind: "CLOSED" | "DISMISSED", reason: string, orderRef: string, signed: boolean) => {
    if (!user) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c) return;
    setCases((prev) =>
      prev.map((x) =>
        x.id === caseId
          ? {
              ...x,
              status: kind,
              orders: [...x.orders, { id: orderRef, title: kind === "CLOSED" ? "Order of closure" : "Order of dismissal", issuedOn: new Date().toISOString(), by: user.name }],
              closure: { kind, reason, orderRef, by: user.name, ts: new Date().toISOString(), signed },
              readOnlyNote: kind === "CLOSED" ? "Case closed — record preserved read-only" : "Dismissed — record preserved read-only",
            }
          : x
      )
    );
    log(kind === "CLOSED" ? "CASE_CLOSED" : "CASE_DISMISSED", { caseId, detail: `${reason} · ref ${orderRef}${signed ? " · digitally signed" : ""}` });
    [...c.parties.map((pp) => pp.userId), ...c.lawyerIds].forEach((uidX) => notify(uidX, "CASE", `${caseId} has been ${kind.toLowerCase()} (ref ${orderRef}).`, caseId));
    toast("success", `Case ${kind.toLowerCase()}`, "Record preserved read-only — nothing deleted.");
  };

  /* ---------------- judge privileges: delete case & shut accounts ---------------- */
  const deleteCase = (caseId: string, reason: string) => {
    if (!user || user.role !== "JUDGE") return;
    const c = cases.find((x) => x.id === caseId);
    if (!c) return;
    
    // Only allow deletion if case is dismissed or closed
    if (c.status !== "DISMISSED" && c.status !== "CLOSED") {
      toast("error", "Cannot delete active case", "Case must be dismissed or closed before deletion.");
      return;
    }
    
    setCases((prev) => prev.filter((x) => x.id !== caseId));
    setDocs((prev) => prev.filter((d) => d.caseId !== caseId));
    setEvidence((prev) => prev.filter((e) => e.caseId !== caseId));
    
    log("CASE_DELETED", { caseId, detail: `Deleted by judge ${user.name} · reason: ${reason}` });
    [...c.parties.map((pp) => pp.userId), ...c.lawyerIds].forEach((uidX) => notify(uidX, "CASE", `${caseId} has been removed from the registry.`, caseId));
    toast("success", "Case deleted", "Case and all associated records removed from registry.");
  };

  const shutAccount = (userId: string, reason: string) => {
    if (!user || user.role !== "JUDGE") return;
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    
    // Only allow shutting VICTIM or ACCUSED accounts
    if (targetUser.role !== "VICTIM" && targetUser.role !== "ACCUSED") {
      toast("error", "Cannot shut official account", "Only victim and accused accounts can be shut by judge.");
      return;
    }
    
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "SUSPENDED" as const } : u));
    log("ACCOUNT_SHUT", { detail: `${targetUser.name} (${targetUser.role}) account shut by judge ${user.name} · reason: ${reason}` });
    notify(userId, "SECURITY", `Your account has been suspended by judicial order. Reason: ${reason}`);
    toast("success", "Account shut", `${targetUser.name}'s account has been suspended.`);
  };

  const registerCase: Parameters<typeof AdminPanel>[0]["onRegisterCase"] = (pp) => {
    if (!user) return;
    const court = courts.find((x) => x.id === pp.courtId);
    const loc = (court?.location ?? "GEN").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "GEN";
    const maxNum = cases.reduce((m, cc) => {
      const n = parseInt(cc.id.split("-").pop() ?? "0", 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 1000);
    const num = maxNum + 1 + Math.floor(Math.random() * 7);
    const id = `CASE-2026-${loc}-${String(num).padStart(6, "0")}`;
    const parties = [
      ...(pp.accusedId ? [{ userId: pp.accusedId, role: "ACCUSED" as const }] : []),
      ...(pp.victimId ? [{ userId: pp.victimId, role: "COMPLAINANT" as const }] : []),
    ];
    const c: CaseFile = {
      id, cno: `${num}/2026`, title: pp.title, type: pp.type, courtId: pp.courtId, judgeId: pp.judgeId,
      lawyerIds: [], stationId: pp.stationId || undefined, ioId: pp.ioId || undefined, parties,
      status: "FILED", filedOn: new Date().toISOString(), firNumber: pp.firNumber || undefined, tags: ["new"],
      hearings: [], orders: [], transfers: [],
    };
    setCases((prev) => [c, ...prev]);
    log("CASE_CREATED", { caseId: id, detail: `Registered at ${court?.name} · assigned ${users.find((u) => u.id === pp.judgeId)?.name ?? "judge"}` });
    notify(pp.judgeId, "CASE", `New case ${id} assigned to your docket.`, id);
    parties.forEach((ppx) => notify(ppx.userId, "CASE", `${id} registered — you are a party of record.`, id));
    if (pp.ioId) notify(pp.ioId, "CASE", `${id} assigned for investigation.`, id);
    toast("success", "Case registered", `${id} minted · immutable from this point.`);
  };

  const mintPersonCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const blk = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `LVC-${blk()}-${blk()}`;
  };

  const dispatchPersonCode = (nu: User) => {
    if (!nu.personCode) return;
    if (isSupabaseConfigured()) {
      void sendPersonCodeEmail({ to: nu.email, phone: nu.phone, name: nu.name, personCode: nu.personCode }).then((sent) => {
        if (sent) toast("success", "Person code emailed", `${nu.email}`);
      });
    }
  };

  const createUser: Parameters<typeof AdminPanel>[0]["onCreateUser"] = (pp) => {
    if (!user) return;
    const nu: User = {
      id: uid("USR"), name: pp.name, role: pp.role, unit: pp.unit,
      courtIds: pp.role === "JUDGE" ? pp.courtIds : pp.role === "ADMIN" || pp.role === "AUDITOR" ? courts.map((x) => x.id) : [],
      stationId: pp.role === "POLICE" ? pp.stationId : undefined,
      email: pp.email, phone: pp.phone || undefined, keyFp: keyFingerprint(), status: "ACTIVE",
      clearanceNote:
        pp.role === "JUDGE" ? "Assigned court docket" : pp.role === "LAWYER" ? "Cases on record as counsel" :
        pp.role === "POLICE" ? "Assigned investigations only" : pp.role === "ACCUSED" || pp.role === "VICTIM" ? "Own cases · permitted docs only" :
        pp.role === "ADMIN" ? "System administration" : "Read-only audit & security",
      passHash: hashPassword(pp.password),
      secQuestion: pp.secQuestion,
      secAnswerHash: hashSecret(pp.secAnswer),
      personCode: mintPersonCode(),
    };
    setUsers((prev) => [...prev, nu]);
    log("USER_CREATED", { detail: `${pp.name} provisioned as ${ROLE_LABEL[pp.role]} (${nu.id}) · person code ${nu.personCode} issued` });
    dispatchPersonCode(nu);
    toast("success", "Principal provisioned", `${nu.id} · person code ${nu.personCode}${isSupabaseConfigured() ? " · emailed" : ""}`);
  };

  /* ---------------- signup · public self-registration + founding registrar ---------------- */
  const signup: (sp: { name: string; role: RoleId; email: string; phone: string; password: string; secQuestion: string; secAnswer: string }) => string | null = (sp) => {
    const first = users.length === 0;
    const role: RoleId = first ? "ADMIN" : sp.role;

    /* VICTIM and ACCUSED cannot self-register - only police can create their accounts */
    if (!first && (role === "VICTIM" || role === "ACCUSED")) {
      log("USER_CREATED", { detail: `Signup rejected — ${ROLE_LABEL[role]} cannot self-register. Contact police to create account.`, actor: sp.name, role: ROLE_LABEL[role] });
      return null;
    }

    if (!first && users.some((x) => x.email.toLowerCase() === sp.email.toLowerCase())) {
      log("USER_CREATED", { detail: `Signup rejected — email already registered (${sp.email})`, actor: sp.name, role: ROLE_LABEL[role] });
      return null;
    }

    const personCode = mintPersonCode();
    const nu: User = {
      id: uid("USR"),
      name: sp.name,
      role,
      unit: first ? "Court Registry" : ROLE_LABEL[role],
      courtIds: first ? [] : role === "ADMIN" || role === "AUDITOR" ? courts.map((x) => x.id) : [],
      stationId: undefined,
      email: sp.email,
      phone: sp.phone || undefined,
      keyFp: keyFingerprint(),
      status: "ACTIVE",
      clearanceNote: first
        ? "Founding registrar · full administration"
        : role === "JUDGE" ? "Assigned court docket"
        : role === "LAWYER" ? "Cases on record as counsel"
        : role === "POLICE" ? "Assigned investigations only"
        : role === "ACCUSED" || role === "VICTIM" ? "Own cases · permitted docs only"
        : role === "ADMIN" ? "System administration"
        : "Read-only audit & security",
      passHash: hashPassword(sp.password),
      secQuestion: sp.secQuestion,
      secAnswerHash: hashSecret(sp.secAnswer),
      personCode,
    };
    setUsers((prev) => [...prev, nu]);
    dispatchPersonCode(nu);

    if (first) {
      log("REGISTRY_PROVISIONED", {
        detail: `Founding registrar ${sp.name} (${nu.id}) provisioned — the registry's first permanent entry · person code ${personCode} issued`,
        actor: sp.name,
        role: ROLE_LABEL.ADMIN,
      });
    } else {
      log("USER_CREATED", { detail: `${sp.name} self-registered as ${ROLE_LABEL[role]} (${nu.id}) · phone ${sp.phone} · person code ${personCode} issued`, actor: sp.name, role: ROLE_LABEL[role] });
      notify(nu.id, "SYSTEM", `Welcome ${sp.name}. Your person code is ${personCode}. Case files appear once the registry links you as a party.`);
    }
    return personCode;
  };

  const saveTOTP = (userId: string, secret: string, recoveryCodes: string[]) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, totpSecret: secret, recoveryCodesHashed: recoveryCodes.map((c) => `rc$${c.replace(/-/g, "")}`) }
          : u
      )
    );
  };

  /* ---------------- police creates victim/accused accounts ---------------- */
  const createPartyAccount: (pp: { name: string; role: "VICTIM" | "ACCUSED"; email: string; phone: string; password: string; createdBy: string }) => string | null = (pp) => {
    if (!user || user.role !== "POLICE") return null;

    if (users.some((x) => x.email.toLowerCase() === pp.email.toLowerCase())) {
      log("USER_CREATED", { detail: `Party account creation rejected — email already registered (${pp.email})`, actor: user.name, role: ROLE_LABEL.POLICE });
      return null;
    }

    const personCode = mintPersonCode();
    const nu: User = {
      id: uid("USR"),
      name: pp.name,
      role: pp.role,
      unit: ROLE_LABEL[pp.role],
      courtIds: [],
      stationId: undefined,
      email: pp.email,
      phone: pp.phone || undefined,
      keyFp: keyFingerprint(),
      status: "ACTIVE",
      clearanceNote: "Own cases · permitted docs only",
      passHash: hashPassword(pp.password),
      personCode,
      createdBy: pp.createdBy,
    };
    setUsers((prev) => [...prev, nu]);
    dispatchPersonCode(nu);
    log("USER_CREATED", { detail: `${pp.name} registered as ${ROLE_LABEL[pp.role]} (${nu.id}) by police ${user.name} · person code ${personCode} issued`, actor: user.name, role: ROLE_LABEL.POLICE });
    notify(nu.id, "SYSTEM", `Welcome ${pp.name}. Your account has been created by the police. Your person code is ${personCode}.`);
    return personCode;
  };

  const addCourt = (pp: { name: string; level: string; location: string }) => {
    if (!user) return;
    const loc = pp.location.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "GEN";
    const id = `CRT-${loc}-${uid("C").split("-")[1]}`;
    setCourts((prev) => [...prev, { id, name: pp.name, level: pp.level, location: pp.location }]);
    log("COURT_REGISTERED", { detail: `${pp.name} (${id}) · ${pp.level} · ${pp.location}` });
    toast("success", "Court registered", `${id} · judges can now be assigned.`);
  };

  const toggleUser = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u || !user) return;
    const next = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, status: next } : x)));
    log(next === "SUSPENDED" ? "USER_DEACTIVATED" : "USER_REACTIVATED", { detail: `${u.name} (${ROLE_LABEL[u.role]}) ${next.toLowerCase()} by ${user.name}` });
    log("PERMISSION_CHANGED", { detail: `Session rights for ${u.id} ${next === "SUSPENDED" ? "revoked" : "restored"}` });
    toast("info", `${u.name} ${next.toLowerCase()}`, "Change written to the ledger.");
  };

  const deleteUser = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u || !user) return;
    
    // Only allow deletion of official roles, not victim/accused
    if (u.role === "VICTIM" || u.role === "ACCUSED") {
      toast("error", "Cannot delete party account", "Victim and accused accounts cannot be deleted for legal record preservation.");
      return;
    }
    
    // Cannot delete yourself
    if (u.id === user.id) {
      toast("error", "Cannot delete your own account", "You cannot delete your own account while logged in.");
      return;
    }
    
    setUsers((prev) => prev.filter((x) => x.id !== id));
    log("USER_DELETED", { detail: `${u.name} (${ROLE_LABEL[u.role]}) permanently deleted by ${user.name}` });
    toast("success", "Account deleted", `${u.name}'s account has been permanently removed.`);
  };

  const resetWorkspace = () => {
    if (!user) return;
    log("WORKSPACE_RESET", { detail: `Factory reset executed by ${user.name} — registry returned to empty first-run state` });
    setTimeout(() => {
      setUsers([]); setCourts([]); setCases([]); setDocs([]); setEvidence([]);
      setAudit([]); setLogins([]); setSecurity([]); setNotices([]);
      setSession(null);
      ["lv4:session", "lv4:users", "lv4:courts", "lv4:cases", "lv4:docs", "lv4:evidence", "lv4:audit", "lv4:logins", "lv4:security", "lv4:notices"].forEach((k) => localStorage.removeItem(k));
      toast("info", "Workspace emptied", "The portal returns to first-run provisioning.");
    }, 400);
  };

  const reviewSecurity = (id: string) => {
    setSecurity((prev) => prev.map((s) => (s.id === id ? { ...s, reviewed: true } : s)));
    const s = security.find((x) => x.id === id);
    if (s) log("SECURITY_ALERT", { detail: `${s.kind} reviewed and closed by ${user?.name}` });
    toast("info", "Alert marked reviewed", "Resolution appended to the ledger.");
  };

  const logSearch = (qStr: string, hits: number) => {
    log("SEARCH", { detail: `Query “${qStr}” · ${hits} authorized result(s) · suppressed matches undisclosed` });
  };

  const verifyFullChain = () => {
    const r = verifyChain(audit);
    log("CHAIN_VERIFIED", { detail: `Full-chain recomputation · ${r.verified} links ${r.ok ? "concordant" : `BROKEN at #${r.badSeq}`}` });
    toast(r.ok ? "success" : "error", r.ok ? "Chain intact" : "Chain broken", r.ok ? `${r.verified} links verified against predecessors.` : `Tampering suspected at #${r.badSeq}.`);
    setNav("audit");
  };

  /* ---------------- Supabase realtime registry sync ---------------- */
  const syncOn = syncAvailable();
  const lastSynced = useRef<Record<string, string>>({});
  const [syncState, setSyncState] = useState<"off" | "connecting" | "live">(syncOn ? "connecting" : "off");

  const applyRemoteRow = useCallback((row: RegistryRow) => {
    const json = JSON.stringify(row.payload);
    if (lastSynced.current[row.id] === json) return; // echo guard
    lastSynced.current[row.id] = json;
    const arr = Array.isArray(row.payload) ? (row.payload as never[]) : [];
    if (row.id === "users") setUsers(arr as User[]);
    else if (row.id === "cases") setCases(arr as CaseFile[]);
    else if (row.id === "docs") setDocs(arr as LegalDoc[]);
    else if (row.id === "evidence") setEvidence(arr as EvidenceItem[]);
  }, [setUsers, setCases, setDocs, setEvidence]);

  /* pull the shared registry once on boot */
  useEffect(() => {
    if (!syncOn) return;
    let cancelled = false;
    void fetchRegistryRows().then((rows) => {
      if (cancelled) return;
      rows.forEach((r) => {
        if (Array.isArray(r.payload) && (r.payload as unknown[]).length > 0) applyRemoteRow(r);
        else lastSynced.current[r.id] = JSON.stringify(r.payload);
      });
      setSyncState("live");
    });
    return () => { cancelled = true; };
  }, [syncOn, applyRemoteRow]);

  /* subscribe for other devices' changes */
  useEffect(() => {
    if (!syncOn) return;
    const close = openRegistryChannel((row) => {
      applyRemoteRow(row);
      setSyncState("live");
    });
    return close;
  }, [syncOn, applyRemoteRow]);

  /* push local changes (debounced, echo-guarded) */
  const pushRow = useCallback((key: SyncKey, data: unknown) => {
    if (!syncOn) return;
    const json = JSON.stringify(data);
    if (lastSynced.current[key] === json) return;
    lastSynced.current[key] = json;
    upsertRegistryRow(key, data);
  }, [syncOn]);

  useEffect(() => { const t = setTimeout(() => pushRow("users", users), 400); return () => clearTimeout(t); }, [users, pushRow]);
  useEffect(() => { const t = setTimeout(() => pushRow("cases", cases), 400); return () => clearTimeout(t); }, [cases, pushRow]);
  useEffect(() => { const t = setTimeout(() => pushRow("docs", docs), 400); return () => clearTimeout(t); }, [docs, pushRow]);
  useEffect(() => { const t = setTimeout(() => pushRow("evidence", evidence), 400); return () => clearTimeout(t); }, [evidence, pushRow]);

  /* ---------------- render ---------------- */
  if (!session || !user) {
    if (gateMode === "landing") {
      return (
        <Landing
          stats={{ courts: courts.length, cases: cases.length, ledger: audit.length, users: users.length }}
          onEnter={(m) => setGateMode(m)}
        />
      );
    }
    return (
      <Login
        users={users}
        initialMode={gateMode === "signup" ? "signup" : "signin"}
        magicReturnId={magicReturnId}
        onLogin={onLogin}
        logLoginEvent={pushLogin}
        onSignup={signup}
        onSaveTOTP={saveTOTP}
        pushSecurity={pushSecurity}
        notice={expiredNotice}
        onBackToLanding={() => setGateMode("landing")}
      />
    );
  }

  const banner = ROLE_BANNER[user.role];
  const myNotices = notices.filter((n) => n.forUserId === user.id);
  const unread = myNotices.filter((n) => !n.read).length;
  const remaining = Math.max(0, session.exp - now.getTime());
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const lowToken = remaining < 2 * 60000;

  const NAV: { key: Nav; label: string; icon: React.ReactNode }[] = [
    { key: "console", label: t("nav.console"), icon: <IcPulse c="w-4 h-4" /> },
    { key: "cases", label: user.role === "ACCUSED" || user.role === "VICTIM" ? t("nav.mycases") : t("nav.cases"), icon: <IcFolder c="w-4 h-4" /> },
    { key: "search", label: t("nav.search"), icon: <IcSearch c="w-4 h-4" /> },
    ...(user.role === "JUDGE" || user.role === "POLICE" || user.role === "ADMIN" || user.role === "AUDITOR"
      ? [{ key: "audit" as Nav, label: t("nav.audit"), icon: <IcChain c="w-4 h-4" /> }]
      : []),
    ...(user.role === "ADMIN" ? [{ key: "admin" as Nav, label: t("nav.admin"), icon: <IcCourt c="w-4 h-4" /> }] : []),
    ...(user.role === "POLICE" ? [{ key: "createParty" as Nav, label: "Create Party Account", icon: <IcUsers c="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="min-h-screen ambient-paper">
      <div className="watermark" aria-hidden="true" />

      {/* banner */}
      <div className={`${BANNER_BG[banner.tone]} text-paper overflow-hidden relative z-20 border-b border-ink/20 h-[24px] flex items-center`}>
        <div className="ticker-move flex items-center whitespace-nowrap font-mono text-[10px] font-semibold tracking-[0.3em] uppercase">
          {[0, 1].map((k) => (
            <span key={k} className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="mx-6">{banner.label} ▸ {user.name} ▸ session ledgered ▸ every action answers who·what·when·where·why ▸</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="flex relative z-10">
        {sideOpen && <div className="fixed inset-0 bg-navy/50 z-30 lg:hidden fade-in" onClick={() => setSideOpen(false)} />}
        <aside className={`ambient-navy fixed lg:sticky top-[24px] lg:top-0 z-40 h-[calc(100vh-24px)] lg:h-screen w-[240px] shrink-0 border-r border-navyline text-paper flex flex-col transition-transform duration-300 ${sideOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="px-5 pt-5 pb-4 border-b border-navyline">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 bg-crimson flex items-center justify-center text-paper"><IcShield c="w-5 h-5" /></span>
              <div>
                <p className="font-display font-bold tracking-[0.18em] text-[17px] leading-none">LEXVAULT</p>
                <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-paper/50 mt-1">{t("app.tag")}</p>
              </div>
              <button className="ml-auto lg:hidden text-paper/60 hover:text-paper" onClick={() => setSideOpen(false)} aria-label="Close menu"><IcX c="w-4 h-4" /></button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-3">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => {
                  setNav(n.key);
                  setSideOpen(false);
                  if (n.key !== "cases") { setSelCase(null); setForbidden(null); }
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all duration-150 border-l-[3px] ${
                  nav === n.key ? "bg-navy2/80 border-crimson text-paper" : "border-transparent text-paper/60 hover:text-paper hover:bg-navy2/40 hover:translate-x-0.5"
                }`}
              >
                {n.icon}
                <span className="font-display text-[13.5px] uppercase tracking-[0.12em] font-medium">{n.label}</span>
              </button>
            ))}

            <div className="mx-4 mt-5 border border-navyline bg-navy2/40 px-3.5 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/45 mb-2">{t("hdr.session")}</p>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${lowToken ? "bg-amber2 pulse-red" : "bg-green2 pulse-dot"}`} />
                <span className={`font-mono text-[13px] tabular-nums ${lowToken ? "text-amber2" : "text-paper/85"}`}>{mm}:{ss}</span>
              </div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-paper/40 mt-1.5">{lowToken ? t("hdr.expires") : t("hdr.renews")}</p>
            </div>
          </nav>

          <div className="border-t border-navyline px-5 pt-4 pb-1">
            <div className={`flex items-center gap-2 border border-navyline rounded-lg px-3 py-2 ${syncState === "live" ? "bg-navy2/50" : "bg-navy2/25"}`}>
              <span className={`w-2 h-2 rounded-full ${syncState === "live" ? "bg-green2 pulse-dot" : syncState === "connecting" ? "bg-amber2 pulse-dot" : "bg-paper/25"}`} />
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/50">{t("sync.line")}</p>
                <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${syncState === "live" ? "text-green2" : syncState === "connecting" ? "text-amber2" : "text-paper/45"}`}>
                  {syncState === "live" ? t("sync.on") : syncState === "connecting" ? t("sync.connecting") : t("sync.off")}
                </p>
              </div>
              <IcChain c="w-3.5 h-3.5 ml-auto text-paper/35" />
            </div>
          </div>

          <div className="border-t border-navyline px-5 py-4">
            <button onClick={logout} className="w-full flex items-center gap-2.5 border border-navyline px-3 py-2.5 text-paper/70 hover:text-paper hover:border-crimson hover:bg-crimson/10 transition-colors">
              <IcLogout c="w-4 h-4" />
              <span className="font-display text-[12.5px] uppercase tracking-[0.12em]">{t("hdr.logout")}</span>
            </button>
          </div>
        </aside>

        {/* main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-[24px] lg:top-0 z-30 bg-paper/95 backdrop-blur-sm border-b border-line px-4 lg:px-6 py-2.5 flex flex-wrap items-center gap-2.5">
            {/* hamburger — quick navigation + notifications (top-left) */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-label={t("hdr.notifications")}
                title={t("hdr.notifications")}
                className={`relative w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  menuOpen
                    ? "bg-crimson border border-crimson text-paper shadow-lg shadow-crimson/30"
                    : "bg-navy border border-navy text-paper hover:bg-navy2 shadow-md shadow-navy/25 hover:-translate-y-0.5"
                } ${flash ? "notif-flash" : ""}`}
              >
                <IcMenu c="w-5 h-5" />
                {unread + feed.unread > 0 && (
                  <span
                    key={unread + feed.unread}
                    className="stamp-in absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-amber2 text-navy font-mono text-[10px] font-bold flex items-center justify-center border-2 border-paper"
                  >
                    {unread + feed.unread}
                  </span>
                )}
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="modal-in absolute left-0 top-full mt-2.5 w-[400px] max-w-[92vw] max-h-[76vh] overflow-y-auto bg-paper border border-line rounded-xl shadow-2xl shadow-navy/30 z-50">
                    <div className="sticky top-0 z-10 bg-navy text-paper rounded-t-[inherit]">
                      <div className="px-4 py-3 flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-crimson flex items-center justify-center shrink-0">
                          <IcShield c="w-3.5 h-3.5" />
                        </span>
                        <p className="font-display font-semibold uppercase tracking-[0.14em] text-[13px]">{t("hdr.notifications")}</p>
                        {unread + feed.unread > 0 && (
                          <span className="font-mono text-[9.5px] font-bold bg-amber2 text-navy rounded-full px-2 py-0.5 tabular-nums">
                            {unread + feed.unread} new
                          </span>
                        )}
                        <button
                          onClick={() => {
                            feed.markAll();
                            setNotices((prev) => prev.map((n) => (n.forUserId === user.id ? { ...n, read: true } : n)));
                          }}
                          className="ml-auto font-mono text-[9px] uppercase tracking-widest text-paper/60 hover:text-[#e0b968] transition-colors"
                        >
                          {t("hdr.markRead")}
                        </button>
                      </div>
                      <div className="h-[2px] bg-gradient-to-r from-[#b98a3e] via-[#b98a3e]/40 to-transparent" />
                    </div>

                    {/* quick navigation */}
                    <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-ink3 px-4 pt-3 pb-1.5">
                      <span className="w-3 h-[3px] bg-brass inline-block rounded-full" /> {t("hdr.quickNav")}
                    </p>
                    <nav className="px-2.5 pb-2 grid grid-cols-2 gap-1.5">
                      {NAV.map((n) => (
                        <button
                          key={n.key}
                          onClick={() => {
                            setNav(n.key);
                            setMenuOpen(false);
                            if (n.key !== "cases") { setSelCase(null); setForbidden(null); }
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 border ${
                            nav === n.key
                              ? "border-crimson/60 bg-crimson/[0.07] text-crimson shadow-[inset_3px_0_0_var(--crimson)]"
                              : "border-line/80 bg-card text-ink2 hover:text-ink hover:border-navy/50 hover:translate-x-0.5"
                          }`}
                        >
                          {n.icon}
                          <span className="font-display text-[11.5px] uppercase tracking-[0.1em] leading-tight">{n.label}</span>
                        </button>
                      ))}
                    </nav>

                    {/* live activity — everything that used to pop bottom-right */}
                    <div className="px-4 pt-2.5 pb-1.5 border-t border-line/70 flex items-center justify-between">
                      <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-ink3">
                        <span className="w-3 h-[3px] bg-brass inline-block rounded-full" /> {t("hdr.activity")}
                      </p>
                      {feed.unread > 0 && <span className="font-mono text-[9px] text-crimson font-bold tabular-nums">{feed.unread} new</span>}
                    </div>
                    {feed.feed.length === 0 ? (
                      <p className="px-3.5 pb-4 text-[12px] text-ink3 leading-relaxed">{t("hdr.emptyFeed")}</p>
                    ) : (
                      <ul className="divide-y divide-line/70 border-t border-line/70">
                        {feed.feed.map((f) => (
                          <li key={f.id}>
                            <button
                              onClick={() => feed.markOne(f.id)}
                              className={`w-full text-left px-3.5 py-2.5 flex gap-2.5 transition-colors hover:bg-paper2/70 ${f.read ? "opacity-60" : ""}`}
                            >
                              <span className={`w-[3px] self-stretch shrink-0 ${f.kind === "success" ? "bg-green2" : f.kind === "error" ? "bg-crimson" : f.kind === "warning" ? "bg-amber2" : "bg-steel"}`} />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="text-[12.5px] font-semibold text-ink leading-tight">{f.title}</span>
                                  {!f.read && <span className="w-1.5 h-1.5 rounded-full bg-crimson pulse-red shrink-0" />}
                                  <span className="ml-auto font-mono text-[9px] text-ink3 whitespace-nowrap">{timeAgo(f.ts)}</span>
                                </span>
                                {f.body && <span className="block text-[11.5px] text-ink2 leading-snug mt-0.5">{f.body}</span>}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* registry notices (cases, hearings, transfers…) */}
                    <div className="px-4 pt-2.5 pb-1.5 border-t border-line/70 flex items-center justify-between">
                      <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-ink3">
                        <span className="w-3 h-[3px] bg-brass inline-block rounded-full" /> {t("hdr.notices")}
                      </p>
                      {unread > 0 && <span className="font-mono text-[9px] text-crimson font-bold tabular-nums">{unread} new</span>}
                    </div>
                    <ul className="divide-y divide-line/70 border-t border-line/70">
                      {myNotices.slice(0, 12).map((n) => (
                        <li key={n.id} className={`px-3.5 py-2.5 ${n.read ? "opacity-60" : ""}`}>
                          <div className="flex items-center gap-2">
                            <Chip tone={n.kind === "SECURITY" ? "red" : n.kind === "TRANSFER" ? "plum" : n.kind === "HEARING" ? "azure" : "navy"}>{n.kind}</Chip>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-crimson pulse-red" />}
                            <span className="ml-auto font-mono text-[9px] text-ink3">{new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-[12.5px] text-ink leading-snug mt-1">{n.text}</p>
                          {n.caseId && (
                            <button
                              onClick={() => { setMenuOpen(false); attemptOpen(n.caseId!); }}
                              className="font-mono text-[9.5px] uppercase tracking-widest text-steel hover:text-crimson transition-colors mt-1"
                            >
                              {t("act.open")} {n.caseId}
                            </button>
                          )}
                        </li>
                      ))}
                      {myNotices.length === 0 && (
                        <li className="px-3.5 py-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink3">{t("hdr.noNotices")}</li>
                      )}
                    </ul>

                    {/* session & sign-out — keeps the menu self-contained on small screens */}
                    <div className="sticky bottom-0 border-t border-line bg-paper2/95 px-3.5 py-2.5 flex items-center gap-2.5 lg:hidden">
                      <span className={`w-1.5 h-1.5 rounded-full ${lowToken ? "bg-amber2 pulse-red" : "bg-green2 pulse-dot"}`} />
                      <span className={`font-mono text-[11px] tabular-nums ${lowToken ? "text-amber" : "text-ink2"}`}>
                        {t("hdr.session")} · {mm}:{ss}
                      </span>
                      <button onClick={logout} className="ml-auto inline-flex items-center gap-1.5 font-display text-[11px] uppercase tracking-[0.12em] text-crimson hover:underline underline-offset-2">
                        <IcLogout c="w-3.5 h-3.5" /> {t("hdr.logout")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <span className="hidden md:inline font-mono text-[12px] text-ink2 tabular-nums mr-1">{fmtClock(now.toISOString())}</span>
            <span className="hidden xl:inline font-mono text-[10px] uppercase tracking-widest text-ink3 border border-line rounded-lg px-2.5 py-1.5">chain · {audit.length}</span>

            <div className="ml-auto flex items-center gap-2">
              <AccessCluster compact />

              <div className="flex items-center gap-2.5 border border-line rounded-full bg-card pl-1.5 pr-3.5 py-1.5">
                <span className="w-7 h-7 rounded-full bg-navy text-paper flex items-center justify-center"><IcKey c="w-3.5 h-3.5" /></span>
                <span className="hidden sm:block">
                  <span className="block text-[12.5px] font-semibold leading-tight text-ink">{user.name}</span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-widest text-ink3">{ROLE_LABEL[user.role]} · {user.keyFp}</span>
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 lg:px-6 py-5 pb-16 max-w-[1400px] w-full mx-auto">
            {nav === "console" && (
              <Dashboard
                user={user} users={users} courts={courts} cases={cases} docs={docs} evidence={evidence} audit={audit} security={security}
                onOpenCase={(id, tab) => { attemptOpen(id); if (tab) setSelTab(tab); }}
                onGo={(v) => setNav(v as Nav)}
                onVerifyChain={verifyFullChain}
                onDownloadDoc={downloadDoc}
              />
            )}
            {nav === "cases" && (
              <CasesView
                user={user} users={users} courts={courts} cases={cases} docs={docs} evidence={evidence} audit={audit}
                selectedId={selCase} selectedTab={selTab}
                onSelect={(id, tab) => { setSelCase(id); if (tab) setSelTab(tab); if (!id) setForbidden(null); }}
                forbidden={forbidden} onClearForbidden={() => setForbidden(null)}
                attemptOpen={attemptOpen}
                uploadDoc={uploadDoc} editDoc={editDoc} approveDoc={approveDoc} signDoc={signDoc}
                downloadDoc={downloadDoc} onVerified={onVerified} tamperDrill={tamperDrill} restoreDoc={restoreDoc}
                deaccessionDoc={deaccessionDoc} viewDoc={viewDoc}
                addEvidenceEvent={addEvidenceEvent} scheduleHearing={scheduleHearing}
                initiateTransfer={initiateTransfer} decideTransfer={decideTransfer} closeCase={closeCase}
                deleteCase={deleteCase} shutAccount={shutAccount}
              />
            )}
            {nav === "search" && <SearchView user={user} users={users} courts={courts} cases={cases} docs={docs} onOpenCase={(id, tab) => { attemptOpen(id); if (tab) setSelTab(tab); }} logSearch={logSearch} />}
            {nav === "audit" && (
              <AuditTrail user={user} audit={audit} logins={logins} security={security} onVerifyChain={verifyFullChain} onReviewSecurity={reviewSecurity} />
            )}
            {nav === "admin" && user.role === "ADMIN" && (
              <AdminPanel
                user={user} users={users} courts={courts} cases={cases}
                onToggleUser={toggleUser} onDeleteUser={deleteUser} onRegisterCase={registerCase} onDecideTransfer={decideTransfer}
                onCreateUser={createUser} onAddCourt={addCourt} onResetWorkspace={resetWorkspace}
              />
            )}
            {nav === "createParty" && user.role === "POLICE" && (
              <CreatePartyAccount
                user={user}
                onCreatePartyAccount={createPartyAccount}
              />
            )}
          </main>

          <footer className={`${BANNER_BG[banner.tone]} text-paper/90 px-4 py-1.5 flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.18em]`}>
            <span className="truncate">{t("footer.line")}</span>
            <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap"><IcCheckSeal c="w-3 h-3" /> {t("footer.seal")}</span>
          </footer>
        </div>
      </div>
      <span className="hidden"><IcCheck c="w-3 h-3" /><IcClock c="w-3 h-3" /></span>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <PrefsProvider>
        <Portal />
      </PrefsProvider>
    </ToastProvider>
  );
}
