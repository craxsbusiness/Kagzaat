import type { ChainLink } from "./lib";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */
export type RoleId = "JUDGE" | "LAWYER" | "ACCUSED" | "VICTIM" | "POLICE" | "ADMIN" | "AUDITOR";

export interface User {
  id: string;
  name: string;
  role: RoleId;
  unit: string;
  courtIds: string[];
  stationId?: string;
  email: string;
  keyFp: string;
  status: "ACTIVE" | "SUSPENDED";
  clearanceNote: string;
  passHash: string;
  /* factor 3 — secret question; answer stored only as a digest */
  secQuestion: string;
  secAnswerHash: string;
  phone?: string;
  personCode?: string;
}

/* secret-question bank (factor 3) — en + hi, other languages fall back via [lang] */
export const SEC_QUESTIONS: { en: string; hi: string; [k: string]: string }[] = [
  { en: "What is your mother's maiden name?", hi: "आपकी माता का मायके का नाम क्या है?" },
  { en: "What is the name of your first school?", hi: "आपके पहले विद्यालय का नाम क्या है?" },
  { en: "What is your native village or hometown?", hi: "आपका मूल गाँव या गृहनगर क्या है?" },
  { en: "What is your favourite festival?", hi: "आपका प्रिय त्योहार कौन-सा है?" },
  { en: "What was the name of your first pet?", hi: "आपके पहले पालतू जानवर का नाम क्या था?" },
];

export interface Court {
  id: string;
  name: string;
  level: string;
  location: string;
}

export type CaseStatus = "FILED" | "INVESTIGATION" | "TRIAL" | "JUDGMENT" | "CLOSED" | "DISMISSED";
export type DocClassification = "PUBLIC" | "COURT" | "INVESTIGATION" | "PRIVILEGED" | "RESTRICTED";
export type DocStatus = "DRAFT" | "REVIEW" | "APPROVED" | "SIGNED" | "RESTRICTED" | "ARCHIVED";
export type VersionStatus = "DRAFT" | "REVIEW" | "APPROVED" | "SIGNED" | "SUPERSEDED";

export interface PartyRef {
  userId: string;
  role: "ACCUSED" | "VICTIM" | "COMPLAINANT" | "WITNESS";
}

export interface Hearing {
  id: string;
  ts: string;
  purpose: string;
  status: "SCHEDULED" | "COMPLETED" | "ADJOURNED";
}

export interface OrderRec {
  id: string;
  title: string;
  issuedOn: string;
  by: string;
}

export interface TransferRec {
  id: string;
  fromCourtId: string;
  toCourtId: string;
  initiatedBy: string;
  initiatedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  reason: string;
  orderRef: string;
  status: "REQUESTED" | "ACCEPTED" | "REJECTED";
}

export interface CaseFile {
  id: string; // immutable, e.g. CASE-2026-DEL-001245
  cno: string;
  title: string;
  type: "CRIMINAL" | "CIVIL" | "MISC";
  courtId: string;
  prevCourtId?: string;
  judgeId: string;
  lawyerIds: string[];
  stationId?: string;
  ioId?: string;
  parties: PartyRef[];
  status: CaseStatus;
  filedOn: string;
  firNumber?: string;
  tags: string[];
  hearings: Hearing[];
  orders: OrderRec[];
  transfers: TransferRec[];
  closure?: { kind: "CLOSED" | "DISMISSED"; reason: string; orderRef: string; by: string; ts: string; signed: boolean };
  readOnlyNote?: string;
}

export interface DocVersion {
  v: number;
  ts: string;
  author: string;
  note: string;
  body: string;
  status: VersionStatus;
  hash: string;
  prevHash: string;
  signature?: { name: string; role: string; ts: string; algo: string };
}

export interface LegalDoc {
  id: string;
  caseId: string;
  type: string;
  title: string;
  classification: DocClassification;
  status: DocStatus;
  uploadedBy: string;
  createdAt: string;
  sizeKB: number;
  versions: DocVersion[];
  accessCount: number;
  tampered?: boolean;
  deaccessioned?: { ts: string; by: string; to: "RESTRICTED" | "ARCHIVED"; reason: string };
}

export interface EvidenceItem {
  id: string;
  caseId: string;
  item: string;
  seizedOn: string;
  location: string;
  custody: { ts: string; actor: string; action: string; note: string }[];
}

export interface LoginEvent {
  id: string;
  ts: string;
  userId: string;
  userName: string;
  kind: "SUCCESS" | "FAILED" | "LOGOUT" | "EXPIRED" | "MFA_OK" | "MFA_FAIL" | "FA3_OK" | "FA3_FAIL" | "TOKEN_ROTATED" | "LOCKOUT";
  device: string;
  ip: string;
  location: string;
  note: string;
}

export interface SecurityEvent {
  id: string;
  ts: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  kind: string;
  detail: string;
  userId?: string;
  reviewed?: boolean;
}

export interface Notice {
  id: string;
  forUserId: string;
  ts: string;
  kind: "CASE" | "DOC" | "HEARING" | "TRANSFER" | "SECURITY" | "SYSTEM";
  text: string;
  read: boolean;
  caseId?: string;
}

/* ================================================================== */
/* Constants                                                           */
/* ================================================================== */
export const CASE_FLOW: CaseStatus[] = ["FILED", "INVESTIGATION", "TRIAL", "JUDGMENT", "CLOSED"];

export const DOC_TYPES = [
  "FIR",
  "Police Report",
  "Investigation Report",
  "Witness Statement",
  "Charge Sheet",
  "Court Filing",
  "Evidence Record",
  "Forensic Report",
  "Legal Notice",
  "Judgment",
  "Court Order",
  "Supporting Document",
];

export const PERMISSION_MATRIX: { action: string; roles: Record<RoleId, boolean> }[] = [
  { action: "View assigned cases", roles: { JUDGE: true, LAWYER: true, ACCUSED: true, VICTIM: true, POLICE: true, ADMIN: true, AUDITOR: true } },
  { action: "Upload documents", roles: { JUDGE: true, LAWYER: true, ACCUSED: false, VICTIM: false, POLICE: true, ADMIN: true, AUDITOR: false } },
  { action: "Edit / new version", roles: { JUDGE: true, LAWYER: true, ACCUSED: false, VICTIM: false, POLICE: true, ADMIN: true, AUDITOR: false } },
  { action: "Approve documents", roles: { JUDGE: true, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: false, ADMIN: true, AUDITOR: false } },
  { action: "Digitally sign", roles: { JUDGE: true, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: true, ADMIN: true, AUDITOR: false } },
  { action: "Download permitted docs", roles: { JUDGE: true, LAWYER: true, ACCUSED: true, VICTIM: true, POLICE: true, ADMIN: true, AUDITOR: false } },
  { action: "Initiate case transfer", roles: { JUDGE: true, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: false, ADMIN: true, AUDITOR: false } },
  { action: "Approve case transfer", roles: { JUDGE: false, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: false, ADMIN: true, AUDITOR: false } },
  { action: "Close / dismiss case", roles: { JUDGE: true, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: false, ADMIN: true, AUDITOR: false } },
  { action: "Evidence custody events", roles: { JUDGE: false, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: true, ADMIN: true, AUDITOR: false } },
  { action: "Manage users & courts", roles: { JUDGE: false, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: false, ADMIN: true, AUDITOR: false } },
  { action: "Read full audit chain", roles: { JUDGE: false, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: false, ADMIN: true, AUDITOR: true } },
  { action: "Deaccession (never delete)", roles: { JUDGE: false, LAWYER: false, ACCUSED: false, VICTIM: false, POLICE: false, ADMIN: true, AUDITOR: false } },
];

export const AUDIT_CATEGORIES: Record<string, string> = {
  LOGIN: "auth", LOGIN_FAILED: "auth", LOGOUT: "auth", SESSION_EXPIRED: "auth", MFA_VERIFIED: "auth",
  TOKEN_ROTATED: "auth", LOCKOUT: "auth",
  DOC_UPLOADED: "document", DOC_VIEWED: "document", DOC_DOWNLOADED: "document", DOC_EDITED: "document",
  VERSION_CREATED: "document", DOC_APPROVED: "document", DOC_SIGNED: "document", DOC_DEACCESSIONED: "document",
  CASE_CREATED: "case", CASE_VIEWED: "case", CASE_MODIFIED: "case", CASE_CLOSED: "case", CASE_DISMISSED: "case",
  HEARING_SCHEDULED: "case",
  CASE_TRANSFER_REQUESTED: "transfer", CASE_TRANSFER_APPROVED: "transfer", CASE_TRANSFER_REJECTED: "transfer",
  EVIDENCE_TRANSFERRED: "evidence",
  USER_CREATED: "admin", USER_DEACTIVATED: "admin", USER_REACTIVATED: "admin", PERMISSION_CHANGED: "admin",
  COURT_REGISTERED: "admin", REGISTRY_PROVISIONED: "admin", WORKSPACE_RESET: "admin",
  ACCESS_DENIED: "security", INTEGRITY_ALERT: "security", CHAIN_VERIFIED: "security", SECURITY_ALERT: "security",
  SEARCH: "search",
};

export function keyFingerprint(): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase();
  return `${hex()}:${hex()}:${hex()}:${hex()}`;
}

/* ================================================================== */
/* The registry starts EMPTY — every record below is real data you add */
/* ================================================================== */
export const COURTS: Court[] = [];
export const USERS: User[] = [];
export const SEED_CASES: CaseFile[] = [];
export const SEED_DOCUMENTS: LegalDoc[] = [];
export const SEED_EVIDENCE: EvidenceItem[] = [];
export const SEED_AUDIT: ChainLink[] = [];
export const SEED_LOGINS: LoginEvent[] = [];
export const SEED_SECURITY: SecurityEvent[] = [];
export const SEED_NOTICES: Notice[] = [];

/* ================================================================== */
/* Authorization engine — the single gate every request passes         */
/* ================================================================== */
export function canSeeCase(u: User, c: CaseFile): boolean {
  if (u.status !== "ACTIVE") return false;
  switch (u.role) {
    case "ADMIN":
    case "AUDITOR":
      return true;
    case "JUDGE":
      return u.courtIds.includes(c.courtId);
    case "LAWYER":
      return c.lawyerIds.includes(u.id);
    case "POLICE":
      return c.ioId === u.id || (!!c.stationId && c.stationId === u.stationId);
    case "ACCUSED":
    case "VICTIM":
      return c.parties.some((p) => p.userId === u.id);
    default:
      return false;
  }
}

export function canSeeDoc(u: User, c: CaseFile, d: LegalDoc): boolean {
  if (!canSeeCase(u, c)) return false;
  if (d.deaccessioned) return u.role === "ADMIN" || u.role === "AUDITOR";
  const cls = d.classification;
  if (cls === "PUBLIC") return true;
  switch (u.role) {
    case "ADMIN":
      return true;
    case "AUDITOR":
      return false;
    case "JUDGE":
      return true;
    case "POLICE":
      return cls === "COURT" || cls === "INVESTIGATION" || cls === "RESTRICTED";
    case "LAWYER":
      return cls === "COURT" || cls === "INVESTIGATION" || cls === "PRIVILEGED";
    case "ACCUSED":
    case "VICTIM":
      return cls === "COURT";
    default:
      return false;
  }
}

export function caseReadOnly(c: CaseFile): boolean {
  return c.status === "CLOSED" || c.status === "DISMISSED";
}

export function canUpload(u: User, c: CaseFile): boolean {
  if (caseReadOnly(c) || !canSeeCase(u, c)) return false;
  switch (u.role) {
    case "JUDGE": return u.courtIds.includes(c.courtId);
    case "LAWYER": return c.lawyerIds.includes(u.id);
    case "POLICE": return c.ioId === u.id || c.stationId === u.stationId;
    case "ADMIN": return true;
    default: return false;
  }
}

export function canEditDoc(u: User, c: CaseFile, d: LegalDoc): boolean {
  if (caseReadOnly(c) || !canSeeDoc(u, c, d)) return false;
  if (d.status === "SIGNED") return false;
  switch (u.role) {
    case "JUDGE": return u.courtIds.includes(c.courtId);
    case "LAWYER": return c.lawyerIds.includes(u.id) && d.classification !== "RESTRICTED";
    case "POLICE": return (c.ioId === u.id || c.stationId === u.stationId) && d.classification !== "PRIVILEGED";
    case "ADMIN": return true;
    default: return false;
  }
}

export const canApprove = (u: User): boolean => u.role === "JUDGE" || u.role === "ADMIN";
export const canSign = (u: User): boolean => u.role === "JUDGE" || u.role === "ADMIN" || u.role === "POLICE";
export const canDownload = (u: User, c: CaseFile, d: LegalDoc): boolean => canSeeDoc(u, c, d) && u.role !== "AUDITOR";

export function canInitiateTransfer(u: User, c: CaseFile): boolean {
  if (caseReadOnly(c)) return false;
  return u.role === "ADMIN" || (u.role === "JUDGE" && u.courtIds.includes(c.courtId));
}
export const canApproveTransfer = (u: User): boolean => u.role === "ADMIN";

export function canCloseDismiss(u: User, c: CaseFile): boolean {
  if (caseReadOnly(c)) return false;
  return u.role === "ADMIN" || (u.role === "JUDGE" && u.courtIds.includes(c.courtId) && c.judgeId === u.id);
}

export function canEvidenceEvent(u: User, c: CaseFile): boolean {
  if (!canSeeCase(u, c)) return false;
  return u.role === "ADMIN" || (u.role === "POLICE" && (c.ioId === u.id || c.stationId === u.stationId));
}

export const canScheduleHearing = (u: User, c: CaseFile): boolean =>
  u.role === "ADMIN" || (u.role === "JUDGE" && u.courtIds.includes(c.courtId));

export const canTamperDrill = (u: User): boolean => u.role === "ADMIN" || u.role === "AUDITOR";
export const canDeaccession = (u: User): boolean => u.role === "ADMIN";

export function auditScope(u: User): "FULL" | "OWN_CASES" | "NONE" {
  if (u.role === "ADMIN" || u.role === "AUDITOR") return "FULL";
  if (u.role === "JUDGE" || u.role === "POLICE" || u.role === "LAWYER") return "OWN_CASES";
  return "NONE";
}

export function visibleCases(u: User, cases: CaseFile[]): CaseFile[] {
  return cases.filter((c) => canSeeCase(u, c));
}

export const ROLE_LABEL: Record<RoleId, string> = {
  JUDGE: "Judge",
  LAWYER: "Lawyer",
  ACCUSED: "Accused",
  VICTIM: "Victim / Complainant",
  POLICE: "Police / IO",
  ADMIN: "Court Administrator",
  AUDITOR: "System Auditor",
};

export const ROLE_BANNER: Record<RoleId, { label: string; tone: "crimson" | "rust" | "amber" | "steel" | "plum" | "green" | "azure" }> = {
  JUDGE: { label: "CONFIDENTIAL · JUDICIAL", tone: "rust" },
  LAWYER: { label: "RESTRICTED · OFFICER OF COURT", tone: "amber" },
  ACCUSED: { label: "PUBLIC INTERFACE · PARTY ACCESS", tone: "steel" },
  VICTIM: { label: "PUBLIC INTERFACE · PARTY ACCESS", tone: "steel" },
  POLICE: { label: "RESTRICTED · INVESTIGATION", tone: "amber" },
  ADMIN: { label: "CONFIDENTIAL · REGISTRY ADMIN", tone: "rust" },
  AUDITOR: { label: "OFFICIAL USE · READ-ONLY AUDIT", tone: "plum" },
};
