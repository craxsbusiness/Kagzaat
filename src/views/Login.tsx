import { useMemo, useState } from "react";
import type { LoginEvent, User } from "../data";
import { ROLE_BANNER, ROLE_LABEL, keyFingerprint } from "../data";
import { deviceInfo, hashPassword, uid } from "../lib";
import { Btn, useToast } from "../ui";
import { useT } from "../i18n";
import { IcCheck, IcChevD, IcFinger, IcKey, IcLock, IcShield, IcUser, IcX } from "../icons";

interface Props {
  users: User[];
  onLogin: (userId: string, device: string, ip: string) => void;
  logLoginEvent: (ev: Omit<LoginEvent, "id" | "ts">) => void;
  onCreateFirstAdmin: (u: User) => void;
  notice?: string | null;
}

const TONE_BG: Record<string, string> = {
  crimson: "bg-crimson",
  rust: "bg-rust",
  amber: "bg-amber",
  steel: "bg-steel",
  plum: "bg-plum",
  green: "bg-green",
  azure: "bg-azure",
};

export default function Login(p: Props) {
  if (p.users.length === 0) return <FirstRun {...p} />;
  return <Gateway {...p} />;
}

/* ================================================================== */
/* First-run provisioning — the registry starts empty                  */
/* ================================================================== */
function FirstRun({ onCreateFirstAdmin }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [unit, setUnit] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const okPw = pw.length >= 8;
  const valid = name.trim().length >= 3 && email.includes("@") && okPw && pw === pw2;

  const submit = () => {
    if (!valid) {
      setErr(!okPw ? "Password must be at least 8 characters." : pw !== pw2 ? "Passwords do not match." : "Complete all fields.");
      setShake((s) => s + 1);
      return;
    }
    onCreateFirstAdmin({
      id: uid("USR"),
      name: name.trim(),
      role: "ADMIN",
      unit: unit.trim() || "Court Registry",
      courtIds: [],
      email: email.trim(),
      keyFp: keyFingerprint(),
      status: "ACTIVE",
      clearanceNote: "Founding registrar · full administration",
      passHash: hashPassword(pw),
    });
  };

  const field = "w-full bg-navy2/60 border border-navyline px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-[#e5a09a] transition-colors";
  const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55 block mb-1.5";

  return (
    <div className="min-h-screen ambient-login text-paper flex items-center justify-center p-6 relative overflow-hidden">
      <div className="scanline absolute inset-0 pointer-events-none" />
      <div className="w-full max-w-xl relative z-10 rise">
        <div className="flex items-center gap-3 justify-center">
          <span className="w-11 h-11 bg-crimson flex items-center justify-center"><IcShield c="w-6 h-6" /></span>
          <div>
            <p className="font-display font-bold tracking-[0.22em] text-[24px] leading-none">LEXVAULT</p>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-paper/50 mt-1.5">{t("app.tag")}</p>
          </div>
        </div>

        <div key={shake} className={`mt-8 bg-navy/80 border border-navyline backdrop-blur-sm ${shake ? "shake-x" : ""}`}>
          <header className="px-7 pt-6 pb-4 border-b border-navyline">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e5a09a]">{t("firstrun.kicker")}</p>
            <h1 className="font-display font-semibold uppercase tracking-wide text-[26px] leading-tight mt-2">{t("firstrun.title")}</h1>
            <p className="text-[13.5px] text-paper/60 leading-relaxed mt-2">{t("firstrun.lede")}</p>
          </header>
          <form className="px-7 py-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{t("firstrun.name")}</label>
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. K. Venkatesan" autoFocus />
              </div>
              <div>
                <label className={label}>{t("firstrun.unit")}</label>
                <input className={field} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Court Registry" />
              </div>
            </div>
            <div>
              <label className={label}>{t("firstrun.email")}</label>
              <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="registry@yourcourt.gov" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{t("firstrun.pw")}</label>
                <div className="relative">
                  <input className={field} type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-paper/50 hover:text-paper transition-colors" aria-label="Toggle password visibility">
                    {showPw ? <IcX c="w-4 h-4" /> : <IcKey c="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={label}>{t("firstrun.pw2")}</label>
                <input className={field} type={showPw ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={`w-2 h-2 ${okPw ? "bg-green2" : "bg-amber2"}`} />
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/55">{t("firstrun.argon")}</p>
            </div>
            {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
            <Btn type="submit" disabled={!valid} className="w-full !py-3 !text-[13px]">
              <IcFinger c="w-4 h-4" /> {t("firstrun.submit")}
            </Btn>
          </form>
        </div>
        <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper/35 mt-5 px-4">{t("firstrun.after")}</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Gateway — credentials + MFA                                         */
/* ================================================================== */
function Gateway({ users, onLogin, logLoginEvent, notice }: Props) {
  const t = useT();
  const toast = useToast();
  const [step, setStep] = useState<"creds" | "mfa">("creds");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [pickOpen, setPickOpen] = useState(false);

  const [mfaCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [mfaInput, setMfaInput] = useState("");

  const device = useMemo(() => deviceInfo(), []);
  const ip = useMemo(() => `10.14.2.${Math.floor(20 + Math.random() * 60)}`, []);

  const fail = (msg: string) => {
    setErr(msg);
    setShake((s) => s + 1);
  };

  const submitCreds = () => {
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      fail(`Account locked — retry in ${Math.ceil((lockUntil - now) / 1000)}s`);
      return;
    }
    const needle = userId.trim().toLowerCase();
    const u = users.find((x) => x.id.toLowerCase() === needle || x.email.toLowerCase() === needle);
    if (!u || hashPassword(password) !== u.passHash) {
      const next = fails + 1;
      setFails(next);
      logLoginEvent({
        userId: u?.id ?? (userId.toUpperCase() || "UNKNOWN"),
        userName: u?.name ?? "Unknown principal",
        kind: "FAILED",
        device,
        ip,
        location: "Gateway",
        note: `Incorrect credentials · attempt ${next} of 3`,
      });
      if (next >= 3) {
        setLockUntil(now + 30000);
        logLoginEvent({
          userId: u?.id ?? "UNKNOWN",
          userName: u?.name ?? "Unknown principal",
          kind: "LOCKOUT",
          device,
          ip,
          location: "Gateway",
          note: "3 consecutive failures — temporary lockout applied",
        });
        fail("3 failed attempts — account locked for 30 seconds. Event escalated to security.");
        setFails(0);
      } else {
        fail(`Invalid credentials (${next}/3). Attempts are ledgered.`);
      }
      return;
    }
    if (u.status === "SUSPENDED") {
      logLoginEvent({ userId: u.id, userName: u.name, kind: "FAILED", device, ip, location: "Gateway", note: "Suspended account attempted sign-in" });
      fail("This account is suspended. Contact the registry administrator.");
      return;
    }
    setErr(null);
    setStep("mfa");
    toast("info", "MFA challenge issued", "6-digit code dispatched (demo code shown below).");
  };

  const submitMfa = () => {
    const needle = userId.trim().toLowerCase();
    const u = users.find((x) => x.id.toLowerCase() === needle || x.email.toLowerCase() === needle)!;
    if (mfaInput !== mfaCode) {
      logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_FAIL", device, ip, location: "Gateway", note: "Incorrect TOTP" });
      setShake((s) => s + 1);
      setErr("Incorrect verification code. Ledgered as MFA_FAIL.");
      return;
    }
    logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_OK", device, ip, location: "Gateway", note: "TOTP accepted" });
    onLogin(u.id, device, ip);
  };

  const field = "w-full bg-navy2/60 border border-navyline px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-[#e5a09a] transition-colors";
  const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55 block mb-1.5";

  return (
    <div className="min-h-screen ambient-login text-paper flex">
      {/* left — identity panel */}
      <div className="hidden lg:flex flex-col w-[46%] px-12 py-10 border-r border-navyline relative overflow-hidden">
        <div className="scanline absolute inset-0 pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <span className="w-11 h-11 bg-crimson flex items-center justify-center"><IcShield c="w-6 h-6" /></span>
          <div>
            <p className="font-display font-bold tracking-[0.22em] text-[24px] leading-none">LEXVAULT</p>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-paper/50 mt-1.5">{t("app.tag")}</p>
          </div>
        </div>
        <div className="mt-14 relative z-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e5a09a]">Every record answers</p>
          <h1 className="font-display font-semibold uppercase leading-[1.04] text-[46px] tracking-wide mt-3">
            {t("login.h1a")}
            <br />
            <span className="text-[#e5a09a]">{t("login.h1b")}</span>
          </h1>
          <p className="text-[14px] text-paper/65 leading-relaxed mt-5 max-w-md">{t("login.lede")}</p>
        </div>
        <div className="mt-auto relative z-10 grid grid-cols-2 gap-3 max-w-md">
          {[
            [t("login.k1"), t("login.k1v")],
            [t("login.k2"), t("login.k2v")],
            [t("login.k3"), t("login.k3v")],
            [t("login.k4"), t("login.k4v")],
          ].map(([k, v], i) => (
            <div key={k} className="rise border border-navyline bg-navy2/40 px-3.5 py-3" style={{ animationDelay: `${i * 90}ms` }}>
              <p className="font-display font-semibold uppercase tracking-[0.14em] text-[11px] text-[#e5a09a]">{k}</p>
              <p className="font-mono text-[10px] text-paper/60 mt-1 leading-relaxed">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* right — the gate */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md rise">
          <div className="lg:hidden flex items-center gap-2.5 mb-6 justify-center">
            <span className="w-9 h-9 bg-crimson flex items-center justify-center"><IcShield c="w-5 h-5" /></span>
            <p className="font-display font-bold tracking-[0.2em] text-[20px]">LEXVAULT</p>
          </div>

          {notice && (
            <div className="fade-in mb-4 border-l-4 border-amber2 bg-amber/10 text-amber px-4 py-2.5 text-[13px] flex items-center gap-2">
              <IcLock c="w-4 h-4 shrink-0" /> {notice}
            </div>
          )}

          {step === "creds" ? (
            <div key={`c${shake}`} className={`bg-navy/80 border border-navyline backdrop-blur-sm ${shake ? "shake-x" : ""}`}>
              <header className="px-7 pt-6 pb-4 border-b border-navyline">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e5a09a]">{t("login.step")}</p>
                <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1.5">{t("login.title")}</h2>
              </header>
              <form className="px-7 py-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submitCreds(); }}>
                <div>
                  <label className={label}>{t("login.id")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40"><IcUser c="w-4 h-4" /></span>
                    <input className={`${field} pl-9`} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="USR-XXXXX or name@court.gov" autoFocus />
                  </div>
                </div>
                <div>
                  <label className={label}>{t("login.password")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40"><IcKey c="w-4 h-4" /></span>
                    <input className={`${field} pl-9 pr-10`} type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/50 hover:text-paper transition-colors" aria-label="Toggle password visibility">
                      {showPw ? <IcX c="w-4 h-4" /> : <IcLock c="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
                <Btn type="submit" className="w-full !py-3 !text-[13px]"><IcKey c="w-4 h-4" /> {t("login.continue")}</Btn>
              </form>
              <footer className="px-7 pb-5">
                <div className="relative">
                  <button onClick={() => setPickOpen((o) => !o)} className="w-full flex items-center justify-between border border-navyline px-3 py-2.5 text-[11.5px] text-paper/60 hover:text-paper hover:border-paper/40 transition-colors">
                    <span className="font-mono uppercase tracking-[0.14em] text-[10px]">{t("login.principals")} · {users.length}</span>
                    <span className={`transition-transform ${pickOpen ? "rotate-180" : ""}`}><IcChevD c="w-3.5 h-3.5" /></span>
                  </button>
                  {pickOpen && (
                    <ul className="modal-in absolute left-0 right-0 bottom-full mb-1 bg-navy border border-navyline shadow-xl shadow-black/40 z-20 max-h-56 overflow-y-auto">
                      {users.map((u) => (
                        <li key={u.id}>
                          <button onClick={() => { setUserId(u.id); setPickOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-navy2 transition-colors">
                            <span className={`w-1.5 h-7 ${TONE_BG[ROLE_BANNER[u.role].tone]}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-semibold leading-tight">{u.name}</span>
                              <span className="block font-mono text-[9.5px] uppercase tracking-widest text-paper/45">{ROLE_LABEL[u.role]} · {u.id}</span>
                            </span>
                            {u.status === "SUSPENDED" && <span className="font-mono text-[8.5px] uppercase text-crimson">suspended</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper/35 mt-3 text-center">{t("login.lockNote")}</p>
              </footer>
            </div>
          ) : (
            <div key={`m${shake}`} className={`bg-navy/80 border border-navyline backdrop-blur-sm ${shake ? "shake-x" : ""}`}>
              <header className="px-7 pt-6 pb-4 border-b border-navyline">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e5a09a]">{t("login.mfaStep")}</p>
                <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1.5">{t("login.mfaTitle")}</h2>
                <p className="text-[12.5px] text-paper/55 mt-1.5">{t("login.mfaSub")}</p>
              </header>
              <form className="px-7 py-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submitMfa(); }}>
                <input
                  className="w-full bg-navy2/60 border border-navyline px-3 py-3 text-center font-mono text-[26px] tracking-[0.5em] text-paper focus:outline-none focus:border-[#e5a09a] transition-colors"
                  value={mfaInput}
                  onChange={(e) => setMfaInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="······"
                  inputMode="numeric"
                  autoFocus
                />
                <div className="border border-dashed border-navyline bg-navy2/40 px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">{t("login.demoCode")}</span>
                  <span className="font-mono text-[15px] font-bold text-green2 tracking-[0.3em]">{mfaCode}</span>
                </div>
                {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
                <div className="flex gap-2">
                  <Btn kind="ghost" onClick={() => { setStep("creds"); setMfaInput(""); setErr(null); }} className="!text-paper/70 !border-navyline hover:!border-paper/40 !bg-transparent">{t("act.back")}</Btn>
                  <Btn type="submit" disabled={mfaInput.length !== 6} className="flex-1"><IcFinger c="w-4 h-4" /> {t("login.verify")}</Btn>
                </div>
              </form>
              <footer className="px-7 pb-5 flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 bg-green2 pulse-dot" />
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper/40">{t("login.tls")}</p>
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
