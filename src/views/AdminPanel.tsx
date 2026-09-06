import { useState } from "react";
import type { CaseFile, Court, RoleId, User } from "../data";
import { PERMISSION_MATRIX, ROLE_LABEL, SEC_QUESTIONS, keyFingerprint } from "../data";
import { hashPassword, uid } from "../lib";
import { Btn, Chip, Modal, ModalHead, Panel, useToast } from "../ui";
import { usePrefs, useT } from "../i18n";
import { IcAlert, IcCheck, IcCheckSeal, IcCourt, IcPlus, IcRefresh, IcSend, IcUsers, IcX } from "../icons";

interface Props {
  user: User;
  users: User[];
  courts: Court[];
  cases: CaseFile[];
  onToggleUser: (id: string) => void;
  onRegisterCase: (p: { title: string; type: CaseFile["type"]; courtId: string; judgeId: string; firNumber: string; accusedId: string; victimId: string; stationId: string; ioId: string }) => void;
  onDecideTransfer: (caseId: string, trfId: string, approve: boolean) => void;
  onCreateUser: (p: { name: string; role: RoleId; email: string; phone: string; unit: string; courtIds: string[]; stationId: string; password: string; secQuestion: string; secAnswer: string }) => void;
  onAddCourt: (p: { name: string; level: string; location: string }) => void;
  onResetWorkspace: () => void;
}

const inputCls = "w-full bg-paper border border-line px-3 py-2 text-[13px] focus:outline-none focus:border-navy placeholder:text-ink3/70 transition-colors";
const labelCls = "font-mono text-[10px] uppercase tracking-[0.16em] text-ink3 block mb-1";

const ROLES: RoleId[] = ["JUDGE", "LAWYER", "ACCUSED", "VICTIM", "POLICE", "ADMIN", "AUDITOR"];

export default function AdminPanel(p: Props) {
  const t = useT();
  const toast = useToast();
  const [regOpen, setRegOpen] = useState(false);
  const [courtOpen, setCourtOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [resetArm, setResetArm] = useState(false);
  const pending = p.cases.flatMap((c) => c.transfers.filter((tr) => tr.status === "REQUESTED").map((tr) => ({ c, tr })));

  return (
    <div className="space-y-4">
      <div className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink3">{t("admin.kicker")}</p>
          <h1 className="font-display font-semibold uppercase text-[30px] leading-none tracking-wide text-ink mt-1">{t("admin.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn kind="ghost" onClick={() => setCourtOpen(true)}><IcCourt c="w-3.5 h-3.5" /> {t("admin.addCourt")}</Btn>
          <Btn kind="ghost" onClick={() => setUserOpen(true)} disabled={p.courts.length === 0} title={p.courts.length === 0 ? "Register a court first" : undefined}>
            <IcUsers c="w-3.5 h-3.5" /> {t("admin.addUser")}
          </Btn>
          <Btn kind="primary" onClick={() => setRegOpen(true)} disabled={p.courts.length === 0 || !p.users.some((u) => u.role === "JUDGE")} title="Requires a court and at least one judge">
            <IcPlus c="w-3.5 h-3.5" /> {t("admin.registerCase")}
          </Btn>
        </div>
      </div>

      {/* transfer queue */}
      <Panel title={`${t("admin.transferQueue")} · ${pending.length} ${t("admin.pending")}`} delay={60}>
        {pending.length === 0 ? (
          <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-widest text-ink3">{t("admin.noTransfers")}</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {pending.map(({ c, tr }) => (
              <li key={tr.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-plum"><IcSend c="w-4 h-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">
                      {c.id} · {p.courts.find((x) => x.id === tr.fromCourtId)?.name} <span className="text-plum">→</span> {p.courts.find((x) => x.id === tr.toCourtId)?.name}
                    </p>
                    <p className="font-mono text-[10px] text-ink3 mt-0.5">{tr.id} · initiated by {tr.initiatedBy} · ref {tr.orderRef} · grounds: {tr.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn kind="green" onClick={() => { p.onDecideTransfer(c.id, tr.id, true); toast("success", "Transfer approved", "Logical ownership moves to the receiving court; record preserved intact."); }}>
                      <IcCheck c="w-3.5 h-3.5" /> Approve & accept
                    </Btn>
                    <Btn kind="danger" onClick={() => { p.onDecideTransfer(c.id, tr.id, false); toast("warning", "Transfer rejected", "The case remains with the originating court."); }}>
                      <IcX c="w-3.5 h-3.5" /> Reject
                    </Btn>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <footer className="px-4 py-2 border-t border-line bg-paper2/50 font-mono text-[9.5px] uppercase tracking-widest text-ink3">
          Approval preserves case ID · documents · versions · evidence · audit history
        </footer>
      </Panel>

      {/* courts */}
      <Panel title={`${t("admin.courts")} · ${p.courts.length}`} delay={120}>
        {p.courts.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <span className="inline-flex w-12 h-12 border-2 border-navy/30 text-navy/50 items-center justify-center"><IcCourt c="w-6 h-6" /></span>
            <p className="font-display uppercase tracking-[0.18em] text-ink text-[15px] mt-4">No courts registered</p>
            <p className="text-[12.5px] text-ink2 mt-2 max-w-md mx-auto">Register your first court to begin — judges are assigned to courts, and cases are minted per court.</p>
            <Btn kind="navy" className="mt-4" onClick={() => setCourtOpen(true)}><IcPlus c="w-3.5 h-3.5" /> {t("admin.addCourt")}</Btn>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {p.courts.map((ct) => (
              <li key={ct.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <IcCourt c="w-4 h-4 text-navy" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">{ct.name}</p>
                  <p className="font-mono text-[10px] text-ink3 mt-0.5">{ct.id} · {ct.level} · {ct.location}</p>
                </div>
                <Chip tone="navy">{p.users.filter((u) => u.courtIds.includes(ct.id)).length} assigned</Chip>
                <Chip>{p.cases.filter((x) => x.courtId === ct.id).length} cases</Chip>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* users */}
      <Panel title={`${t("admin.principals")} · ${p.users.length}`} delay={180}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[780px]">
            <thead>
              <tr className="border-b border-line bg-paper2/70">
                {["Principal", "Role", "Unit / assignment", "Key", "Status", "Access scope", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.users.map((u) => (
                <tr key={u.id} className={`border-b border-line/70 last:border-0 ${u.status === "SUSPENDED" ? "opacity-55" : ""}`}>
                  <td className="px-4 py-2.5">
                    <p className="text-[13px] font-semibold text-ink">{u.name}</p>
                    <p className="font-mono text-[9.5px] text-ink3">
                      {u.id} · {u.email}{u.phone ? ` · ${u.phone}` : ""}
                      {u.personCode && <span className="block text-steel mt-0.5">{u.personCode}</span>}
                    </p>
                  </td>
                  <td className="px-4 py-2.5"><Chip tone={u.role === "ADMIN" ? "red" : u.role === "JUDGE" ? "navy" : u.role === "AUDITOR" ? "plum" : "neutral"}>{ROLE_LABEL[u.role]}</Chip></td>
                  <td className="px-4 py-2.5 text-[12px] text-ink2">
                    {u.unit}
                    {u.courtIds.length > 0 && <span className="block font-mono text-[9.5px] text-ink3 mt-0.5">{u.courtIds.map((cid) => p.courts.find((x) => x.id === cid)?.name ?? cid).join(" · ")}</span>}
                    {u.stationId && <span className="block font-mono text-[9.5px] text-ink3 mt-0.5">{u.stationId}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-steel">{u.keyFp}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-[9.5px] uppercase tracking-widest font-bold ${u.status === "ACTIVE" ? "text-green" : "text-crimson"}`}>
                      {u.status === "ACTIVE" ? "● active" : "■ suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[11.5px] text-ink2">{u.clearanceNote}</td>
                  <td className="px-4 py-2.5">
                    {u.id !== p.user.id && (
                      <Btn kind={u.status === "ACTIVE" ? "danger" : "green"} onClick={() => p.onToggleUser(u.id)}>
                        {u.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* RBAC matrix */}
      <Panel title={t("admin.matrix")} delay={240} right={<Chip tone="navy">enforced on every request</Chip>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead>
              <tr className="border-b border-line bg-paper2/70">
                <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink3 font-medium">Action</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink3 font-medium text-center whitespace-nowrap">{ROLE_LABEL[r].split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.action} className="border-b border-line/70 last:border-0 hover:bg-navy/[0.03] transition-colors">
                  <td className="px-4 py-2 text-[12.5px] font-medium text-ink">{row.action}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-2 py-2 text-center">
                      {row.roles[r] ? (
                        <span className="inline-flex w-5 h-5 border border-green/50 text-green bg-green/5 items-center justify-center"><IcCheck c="w-3 h-3" /></span>
                      ) : (
                        <span className="inline-flex w-5 h-5 border border-line text-ink3/60 bg-paper2/40 items-center justify-center"><IcX c="w-2.5 h-2.5" /></span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* security config */}
      <Panel title={t("admin.config")} delay={300}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line/70">
          {[
            ["Transport", "TLS 1.3 · HSTS · secure headers"],
            ["Credentials", "Argon2id · MFA/TOTP enforced"],
            ["Sessions", "15-min tokens · rotation on activity"],
            ["Storage", "AES-256-GCM envelopes · WORM legal hold"],
            ["Integrity", "SHA-256 per version · hash-chained ledger"],
            ["Authorization", "RBAC + case relationship + classification"],
            ["Disclosure", "403 responses never reveal existence"],
            ["Recovery", "Encrypted nightly snapshots · restore drills"],
            ["Keys", "HSM-held KEKs · dual-custody rotation"],
          ].map(([k, v]) => (
            <div key={k} className="bg-card px-4 py-3 flex items-start gap-3">
              <span className="text-green mt-0.5"><IcCheckSeal c="w-4 h-4" /></span>
              <div>
                <p className="font-display font-semibold uppercase tracking-[0.12em] text-[11.5px] text-ink">{k}</p>
                <p className="text-[11.5px] text-ink2 mt-0.5">{v}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* danger zone */}
      <Panel title={t("admin.danger")} delay={360} right={<IcAlert c="w-4 h-4 text-crimson" />}>
        <div className="px-4 py-4 flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-ink">{t("admin.reset")}</p>
            <p className="text-[12px] text-ink2 mt-0.5">Returns the portal to its empty first-run state: courts, principals, cases, documents and the audit ledger are cleared so you can start fresh with real records. The reset itself is the final ledgered act.</p>
          </div>
          {!resetArm ? (
            <Btn kind="danger" onClick={() => setResetArm(true)}><IcRefresh c="w-3.5 h-3.5" /> {t("admin.reset")}</Btn>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-crimson pulse-red">confirm?</span>
              <Btn kind="primary" onClick={() => { p.onResetWorkspace(); setResetArm(false); }}>Yes, empty workspace</Btn>
              <Btn kind="ghost" onClick={() => setResetArm(false)}>{t("act.cancel")}</Btn>
            </div>
          )}
        </div>
      </Panel>

      {regOpen && <RegisterCaseModal p={p} onClose={() => setRegOpen(false)} />}
      {courtOpen && <CourtModal p={p} onClose={() => setCourtOpen(false)} />}
      {userOpen && <UserModal p={p} onClose={() => setUserOpen(false)} />}
    </div>
  );
}

/* ================================================================== */
function RegisterCaseModal({ p, onClose }: { p: Props; onClose: () => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CaseFile["type"]>("CRIMINAL");
  const [courtId, setCourtId] = useState(p.courts[0]?.id ?? "");
  const [judgeId, setJudgeId] = useState("");
  const [fir, setFir] = useState("");
  const [accusedId, setAccusedId] = useState("");
  const [victimId, setVictimId] = useState("");
  const [stationId, setStationId] = useState("");
  const [ioId, setIoId] = useState("");
  const judges = p.users.filter((u) => u.role === "JUDGE" && u.courtIds.includes(courtId));
  const ios = p.users.filter((u) => u.role === "POLICE");
  const valid = title.trim().length > 6 && !!judgeId;

  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={t("admin.registerCase")} sub="an immutable case number is minted at registration" onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          p.onRegisterCase({ title: title.trim(), type, courtId, judgeId, firNumber: fir.trim(), accusedId, victimId, stationId, ioId });
          onClose();
        }}
      >
        <div>
          <label className={labelCls}>Case title</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. State v. … — nature of offence" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as CaseFile["type"])}>
              <option>CRIMINAL</option><option>CIVIL</option><option>MISC</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Court</label>
            <select className={inputCls} value={courtId} onChange={(e) => { setCourtId(e.target.value); setJudgeId(""); }}>
              {p.courts.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Assign judge</label>
            <select className={inputCls} value={judgeId} onChange={(e) => setJudgeId(e.target.value)}>
              <option value="">Select…</option>
              {judges.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
            {judges.length === 0 && <p className="font-mono text-[9px] uppercase text-amber mt-1">No judge assigned to this court yet</p>}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>FIR / complaint number</label>
            <input className={inputCls} value={fir} onChange={(e) => setFir(e.target.value)} placeholder="FIR 158/2026 · PS …" />
          </div>
          <div>
            <label className={labelCls}>Police station / IO</label>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} value={stationId} onChange={(e) => setStationId(e.target.value)} placeholder="PS code…" />
              <select className={inputCls} value={ioId} onChange={(e) => setIoId(e.target.value)}>
                <option value="">No IO</option>
                {ios.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Accused (party)</label>
            <select className={inputCls} value={accusedId} onChange={(e) => setAccusedId(e.target.value)}>
              <option value="">None yet</option>
              {p.users.filter((u) => u.role === "ACCUSED").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Victim / complainant (party)</label>
            <select className={inputCls} value={victimId} onChange={(e) => setVictimId(e.target.value)}>
              <option value="">None yet</option>
              {p.users.filter((u) => u.role === "VICTIM").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink3">On registration the case number is minted, CASE_CREATED is ledgered, and the judge, IO & parties are notified. Numbers are never reused.</p>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>{t("act.cancel")}</Btn>
          <Btn type="submit" disabled={!valid}><IcPlus c="w-3.5 h-3.5" /> {t("admin.registerCase")}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function CourtModal({ p, onClose }: { p: Props; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("District & Sessions");
  const [location, setLocation] = useState("");
  const valid = name.trim().length > 4 && location.trim().length > 2;
  return (
    <Modal onClose={onClose}>
      <ModalHead title={t("admin.addCourt")} sub="courts anchor dockets, judges & case numbers" onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          p.onAddCourt({ name: name.trim(), level: level.trim(), location: location.trim() });
          onClose();
        }}
      >
        <div>
          <label className={labelCls}>{t("admin.courtName")}</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. District & Sessions Court, Saket" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("admin.courtLevel")}</label>
            <input className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t("admin.courtLoc")}</label>
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>{t("act.cancel")}</Btn>
          <Btn type="submit" disabled={!valid}><IcCourt c="w-3.5 h-3.5" /> {t("admin.addCourt")}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function UserModal({ p, onClose }: { p: Props; onClose: () => void }) {
  const t = useT();
  const { lang } = usePrefs();
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>("JUDGE");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [unit, setUnit] = useState("");
  const [courtIds, setCourtIds] = useState<string[]>([]);
  const [stationId, setStationId] = useState("");
  const [password, setPassword] = useState("");
  const [qIdx, setQIdx] = useState(0);
  const [qCustom, setQCustom] = useState(false);
  const [qText, setQText] = useState("");
  const [ans, setAns] = useState("");
  const needsCourts = role === "JUDGE" || role === "ADMIN" || role === "AUDITOR";
  const okPhone = phone.trim() === "" || /^[+]?[\d\s\-()]{8,17}$/.test(phone.trim());
  const okQ = !qCustom || qText.trim().length >= 6;
  const valid =
    name.trim().length >= 3 && email.includes("@") && password.length >= 8 && okPhone && okQ &&
    ans.trim().length >= 2 && (!needsCourts || courtIds.length > 0) && (role !== "POLICE" || stationId.trim().length > 1);

  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={t("admin.addUser")} sub="credentials are stored as Argon2id digests only" onClose={onClose} />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          p.onCreateUser({
            name: name.trim(), role, email: email.trim(), phone: phone.trim(), unit: unit.trim() || ROLE_LABEL[role],
            courtIds, stationId: stationId.trim(), password,
            secQuestion: qCustom ? qText.trim() : SEC_QUESTIONS[qIdx][lang],
            secAnswer: ans,
          });
          onClose();
        }}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Full name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select className={inputCls} value={role} onChange={(e) => { setRole(e.target.value as RoleId); setCourtIds([]); }}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{t("admin.phoneLbl")}</label>
            <input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXXXX" />
          </div>
          <div>
            <label className={labelCls}>Unit / chamber / station</label>
            <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Court 4 · Saket" />
          </div>
        </div>
        {needsCourts && (
          <div>
            <label className={labelCls}>Court assignment {role === "JUDGE" ? "(defines the judge's docket)" : "(registry-wide)"}</label>
            <div className="flex flex-wrap gap-2">
              {p.courts.map((ct) => {
                const on = courtIds.includes(ct.id);
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setCourtIds((prev) => (on ? prev.filter((x) => x !== ct.id) : [...prev, ct.id]))}
                    className={`font-mono text-[10.5px] uppercase tracking-wide px-2.5 py-2 border transition-colors ${on ? "bg-navy text-paper border-navy" : "bg-card text-ink2 border-line hover:border-navy"}`}
                  >
                    {ct.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {role === "POLICE" && (
          <div>
            <label className={labelCls}>Station code (scopes assigned investigations)</label>
            <input className={inputCls} value={stationId} onChange={(e) => setStationId(e.target.value)} placeholder="e.g. PS-MEH" />
          </div>
        )}
        <div>
          <label className={labelCls}>Initial password · min 8 chars (shared once, in person)</label>
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t("admin.secQLbl")}</label>
            <select className={inputCls} value={qCustom ? "custom" : String(qIdx)} onChange={(e) => { if (e.target.value === "custom") setQCustom(true); else { setQCustom(false); setQIdx(Number(e.target.value)); } }}>
              {SEC_QUESTIONS.map((qq, i) => <option key={i} value={i}>{qq[lang]}</option>)}
              <option value="custom">{t("signup.secCustom")}</option>
            </select>
            {qCustom && <input className={`${inputCls} mt-2`} value={qText} onChange={(e) => setQText(e.target.value)} placeholder={t("signup.secCustomPh")} />}
          </div>
          <div>
            <label className={labelCls}>{t("admin.secALbl")}</label>
            <input className={inputCls} type="password" value={ans} onChange={(e) => setAns(e.target.value)} placeholder="••••••" />
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink3 mt-1">{t("signup.ansHint")}</p>
          </div>
        </div>
        <div className="border border-line bg-paper2/60 px-3 py-2.5 font-mono text-[10px] text-ink2 leading-relaxed">
          A unique person code is issued at provisioning and dispatched by email where the mail service is connected. Sign-in is protected by layered verification.
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink3">Key fingerprint on first sign-in: {keyFingerprint()} · USER_CREATED will be ledgered</p>
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={onClose}>{t("act.cancel")}</Btn>
          <Btn type="submit" disabled={!valid}><IcUsers c="w-3.5 h-3.5" /> {t("admin.addUser")}</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* keep uid import for parity with ledger ids minted upstream */
export const __mint = () => uid("X");
export const __hash = (x: string) => hashPassword(x);
