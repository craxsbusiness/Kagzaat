import { useEffect, useMemo, useRef, useState } from "react";
import type { LoginEvent, RoleId, User } from "../data";
import { ROLE_BANNER } from "../data";
import { deviceInfo, hashPassword, useReducedMotion } from "../lib";
import { Btn, useToast } from "../ui";
import { usePrefs, useT } from "../i18n";
import { IcCheck, IcChevD, IcFinger, IcKey, IcLock, IcShield, IcUser, IcX } from "../icons";

interface Props {
  users: User[];
  initialMode?: "signin" | "signup";
  onLogin: (userId: string, device: string, ip: string) => void;
  logLoginEvent: (ev: Omit<LoginEvent, "id" | "ts">) => void;
  onSignup: (p: { name: string; role: RoleId; email: string; password: string; courtIds: string[]; stationId: string }) => boolean;
  pushSecurity?: (severity: "INFO" | "WARN" | "CRITICAL", kind: string, detail: string, userId?: string) => void;
  onBackToLanding?: () => void;
  notice?: string | null;
}

const ALL_ROLES: RoleId[] = ["JUDGE", "LAWYER", "ACCUSED", "VICTIM", "POLICE", "ADMIN", "AUDITOR"];

const TONE_BG: Record<string, string> = {
  crimson: "bg-crimson",
  rust: "bg-rust",
  amber: "bg-amber",
  steel: "bg-steel",
  plum: "bg-plum",
  green: "bg-green",
  azure: "bg-azure",
};

const field = "w-full bg-navy2/60 border border-navyline px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-[#e0b968] transition-colors";
const label = "font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper/55 block mb-1.5";

export default function Login(p: Props) {
  return <Gateway {...p} />;
}

/* ================================================================== */
/* Fingerprint sensor (factor 3)                                       */
/* ================================================================== */
function FingerprintGlyph({ tone }: { tone: "idle" | "scanning" | "done" }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`w-full h-full transition-colors duration-500 ${tone === "done" ? "text-green2" : tone === "scanning" ? "text-[#e0b968]" : "text-paper/60"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M20 76 A40 40 0 0 1 100 76" strokeDasharray="54 10 32 9" />
      <path d="M28 80 A32 32 0 0 1 92 80" strokeDasharray="42 9 26 7" />
      <path d="M36 84 A24 24 0 0 1 84 84" strokeDasharray="31 8 19 6" />
      <path d="M44 87 A16 16 0 0 1 76 87" strokeDasharray="21 7" />
      <path d="M52 89 A8 8 0 0 1 68 89" />
      <path d="M20 91 C33 99 50 102 60 102 C70 102 87 99 100 91" strokeDasharray="27 8 31 9" opacity="0.85" />
      <path d="M31 99 C42 105 52 107 60 107 C68 107 78 105 89 99" strokeDasharray="18 6 23 7" opacity="0.6" />
      <path d="M60 36 A22 22 0 0 1 82 58" opacity="0.65" />
      <path d="M60 27 A31 31 0 0 1 91 58" opacity="0.45" />
      <path d="M60 45 A13 13 0 0 1 73 58" opacity="0.9" />
      <path d="M29 58 A31 31 0 0 1 44 32" opacity="0.45" />
    </svg>
  );
}

function BiometricStep({ userName, onMatch }: { userName: string; onMatch: (score: string) => void }) {
  const t = useT();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [released, setReleased] = useState(false);
  const [score] = useState(() => (98.6 + Math.random() * 1.3).toFixed(1));
  const timer = useRef<number | null>(null);
  const doneTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (doneTimer.current) window.clearTimeout(doneTimer.current);
    },
    []
  );

  const start = () => {
    if (phase !== "idle") return;
    setReleased(false);
    setPhase("scanning");
    timer.current = window.setTimeout(() => {
      setPhase("done");
      doneTimer.current = window.setTimeout(() => onMatch(score), reduced ? 200 : 750);
    }, reduced ? 300 : 1800);
  };
  const cancel = () => {
    if (phase !== "scanning") return;
    if (timer.current) window.clearTimeout(timer.current);
    setPhase("idle");
    setReleased(true);
  };

  return (
    <>
      <style>{`
        @keyframes bioscan{0%{top:8%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:88%;opacity:0}}
        @keyframes biofill{from{width:6%}to{width:100%}}
        @keyframes bioring{0%{box-shadow:0 0 0 0 rgba(85,145,106,.55)}100%{box-shadow:0 0 0 16px rgba(85,145,106,0)}}
      `}</style>
      <header className="px-7 pt-4 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e0b968]">{t("login.bioKicker")}</p>
        <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.bioTitle")}</h2>
        <p className="text-[12.5px] text-paper/55 mt-1.5">
          {t("login.bioSub")} <span className="text-paper/80 font-semibold">{userName}</span>
        </p>
      </header>

      <div className="px-7 pb-5 flex flex-col items-center">
        <button
          type="button"
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && phase === "idle") {
              e.preventDefault();
              start();
            }
          }}
          aria-label={t("login.bioHold")}
          className={`relative w-44 h-44 rounded-full border-2 overflow-hidden select-none transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b968] ${
            phase === "done"
              ? "border-green2 bg-green/10"
              : phase === "scanning"
              ? "border-[#e0b968] bg-[#e0b968]/10 scale-[1.03]"
              : "border-navyline bg-navy2/50 hover:border-paper/40 active:scale-[0.98]"
          }`}
          style={phase === "done" ? { animation: "bioring 0.9s ease-out 2" } : undefined}
        >
          <div className="absolute inset-4">
            <FingerprintGlyph tone={phase} />
          </div>
          {phase === "scanning" && (
            <span
              className="absolute left-[10%] right-[10%] h-[3px] bg-[#e0b968] rounded-full"
              style={{
                animation: `bioscan ${reduced ? 0.3 : 1.8}s linear ${reduced ? "1" : "infinite"}`,
                boxShadow: "0 0 14px 3px rgba(224,185,104,0.55)",
              }}
            />
          )}
          {phase === "done" && (
            <span className="absolute inset-0 flex items-center justify-center bg-navy/55 fade-in">
              <span className="w-14 h-14 rounded-full bg-green2 text-navy flex items-center justify-center stamp-in">
                <IcCheck c="w-7 h-7" />
              </span>
            </span>
          )}
        </button>

        {/* progress rail */}
        <div className="w-44 h-[3px] bg-navyline mt-4 overflow-hidden">
          {phase === "scanning" && (
            <span className="block h-full bg-[#e0b968]" style={{ animation: `biofill ${reduced ? 0.3 : 1.8}s linear forwards` }} />
          )}
          {phase === "done" && <span className="block h-full w-full bg-green2" />}
        </div>

        <p className={`font-mono text-[10.5px] uppercase tracking-[0.18em] mt-3 ${phase === "done" ? "text-green2" : phase === "scanning" ? "text-[#e0b968]" : "text-paper/50"}`}>
          {phase === "done" ? `${t("login.bioOk")} · ${score}%` : phase === "scanning" ? t("login.bioScanning") : t("login.bioHold")}
        </p>
        {released && phase === "idle" && <p className="text-[12px] text-[#e0b968] mt-2 fade-in">{t("login.bioCancel")}</p>}
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/35 mt-4 text-center">
          Verification is completed on your device
        </p>
      </div>
    </>
  );
}

/* ================================================================== */
/* Gateway — always shows Sign in / Create account                     */
/* ================================================================== */
function Gateway(p: Props) {
  const t = useT();
  const { lang } = usePrefs();
  const toast = useToast();
  const empty = p.users.length === 0;

  const [mode, setMode] = useState<"signin" | "signup">(p.initialMode ?? (empty ? "signup" : "signin"));
  const [step, setStep] = useState<"creds" | "mfa" | "bio">("creds");
  const [pending, setPending] = useState<User | null>(null);

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"ALL" | RoleId>("ALL");

  const [mfaCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [mfaInput, setMfaInput] = useState("");

  const device = useMemo(() => deviceInfo(), []);
  const ip = useMemo(() => `10.14.2.${Math.floor(20 + Math.random() * 60)}`, []);

  const filteredPrincipals = useMemo(
    () => p.users.filter((u) => (roleFilter === "ALL" ? true : u.role === roleFilter)),
    [p.users, roleFilter]
  );

  const fail = (msg: string) => {
    setErr(msg);
    setShake((s) => s + 1);
  };

  /* ---------------- factor 1 · password ---------------- */
  const submitCreds = () => {
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      fail(`Account locked — retry in ${Math.ceil((lockUntil - now) / 1000)}s`);
      return;
    }
    const needle = userId.trim().toLowerCase();
    const u = p.users.find((x) => x.id.toLowerCase() === needle || x.email.toLowerCase() === needle);
    if (!u || hashPassword(password) !== u.passHash) {
      const next = fails + 1;
      setFails(next);
      p.logLoginEvent({
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
        p.logLoginEvent({
          userId: u?.id ?? "UNKNOWN",
          userName: u?.name ?? "Unknown principal",
          kind: "LOCKOUT",
          device,
          ip,
          location: "Gateway",
          note: "3 consecutive failures — temporary lockout applied · security event raised",
        });
        p.pushSecurity?.("CRITICAL", "CREDENTIAL_STUFFING", `3 failed logins from ${ip} — account locked, pattern flagged`, u?.id);
        fail("3 failed attempts — account locked for 30 seconds. Event escalated to security.");
        setFails(0);
      } else {
        fail(`Invalid credentials (${next}/3). Attempts are ledgered.`);
      }
      return;
    }
    if (u.status === "SUSPENDED") {
      p.logLoginEvent({ userId: u.id, userName: u.name, kind: "FAILED", device, ip, location: "Gateway", note: "Suspended account attempted sign-in" });
      fail("This account is suspended. Contact the registry administrator.");
      return;
    }
    setErr(null);
    setPending(u);
    setStep("mfa");
    toast("info", "Credentials accepted", "Verification is continuing on the secure channel.");
  };

  /* ---------------- factor 2 · one-time code ---------------- */
  const submitMfa = () => {
    const u = pending!;
    if (mfaInput !== mfaCode) {
      p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_FAIL", device, ip, location: "Gateway", note: "Incorrect one-time code" });
      setShake((s) => s + 1);
      setErr("Incorrect one-time code. Ledgered as MFA_FAIL.");
      return;
    }
    p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_OK", device, ip, location: "Gateway", note: "One-time code accepted" });
    setErr(null);
    setMfaInput("");
    setStep("bio");
    toast("info", "Code accepted", "One more verification remains before entry.");
  };

  /* ---------------- factor 3 · fingerprint ---------------- */
  const onBioMatch = (score: string) => {
    const u = pending!;
    p.logLoginEvent({ userId: u.id, userName: u.name, kind: "FA3_OK", device, ip, location: "Gateway", note: `Fingerprint verified · match score ${score}%` });
    p.onLogin(u.id, device, ip);
  };

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

        <div className="mt-12 relative z-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0b968]">{t("login.3fa")}</p>
          <h1 className="font-display font-semibold uppercase leading-[1.04] text-[44px] tracking-wide mt-3">
            {t("login.h1a")}
            <br />
            {t("login.h1b")}
          </h1>
          <p className="text-[14px] text-paper/65 leading-relaxed mt-5 max-w-md">{t("login.lede")}</p>
        </div>

        {/* courtroom mark — the bench */}
        <div className="mt-9 relative z-10 max-w-md">
          <svg viewBox="0 0 220 120" className="w-44 h-auto text-paper/70 scale-sway" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M110 18 V86" />
            <path d="M80 86 H140 M90 94 H130" strokeWidth="3.2" />
            <circle cx="110" cy="12" r="5" className="text-[#e5b768]" />
            <path d="M38 34 H182" strokeWidth="3" />
            <path d="M38 34 L26 64 M38 34 L50 64 M20 64 A18 8 0 0 0 56 64 Z" strokeWidth="2" className="text-[#e5b768]" />
            <path d="M182 34 L170 64 M182 34 L194 64 M164 64 A18 8 0 0 0 200 64 Z" strokeWidth="2" className="text-[#e5b768]" />
          </svg>
          <p className="font-display italic text-[15px] text-paper/60 mt-4 max-w-sm leading-snug">
            {lang === "hi" ? "“न्याय तभी होता है जब वह अभिलेख पर हो।”" : "“Justice is not done until it is on record.”"}
          </p>
        </div>

        <div className="mt-auto relative z-10 grid grid-cols-2 gap-3 max-w-md">
          {[
            ["login.k1", "login.k1v"],
            ["login.k2", "login.k2v"],
            ["login.k3", "login.k3v"],
            ["login.k4", "login.k4v"],
          ].map(([k, v], i) => (
            <div key={k} className="rise border border-navyline bg-navy2/40 px-3.5 py-3" style={{ animationDelay: `${i * 90}ms` }}>
              <p className="font-display font-semibold uppercase tracking-[0.14em] text-[11px] text-[#e0b968]">{t(k)}</p>
              <p className="font-mono text-[10px] text-paper/60 mt-1 leading-relaxed">{t(v)}</p>
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

          {p.notice && (
            <div className="fade-in mb-4 border-l-4 border-amber2 bg-amber/10 text-amber px-4 py-2.5 text-[12.5px] flex items-center gap-2">
              <IcLock c="w-4 h-4 shrink-0" /> {p.notice}
            </div>
          )}

          <div key={shake} className={`bg-navy/80 border border-navyline rounded-xl backdrop-blur-sm shadow-2xl shadow-black/40 ${shake ? "shake-x" : ""}`}>
            {/* LOGIN / SIGNUP — always visible */}
            <div className="grid grid-cols-2 border-b border-navyline rounded-t-[inherit]" role="tablist" aria-label="Authentication mode">
              <button
                role="tab"
                aria-selected={mode === "signin"}
                onClick={() => { setMode("signin"); setErr(null); }}
                className={`font-display font-semibold uppercase tracking-[0.14em] text-[13.5px] py-4 transition-colors border-b-2 rounded-tl-xl ${
                  mode === "signin" ? "text-paper border-crimson bg-navy2/50" : "text-paper/45 border-transparent hover:text-paper/80"
                }`}
              >
                {t("login.tab.signin")}
              </button>
              <button
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => { setMode("signup"); setErr(null); }}
                className={`font-display font-semibold uppercase tracking-[0.14em] text-[13.5px] py-4 transition-colors border-b-2 rounded-tr-xl ${
                  mode === "signup" ? "text-paper border-green2 bg-navy2/50" : "text-paper/45 border-transparent hover:text-paper/80"
                }`}
              >
                {t("login.tab.signup")}
              </button>
            </div>

            {mode === "signup" ? (
              <SignupForm
                p={p}
                empty={empty}
                onCreated={(email) => {
                  setMode("signin");
                  setUserId(email);
                  setStep("creds");
                  setErr(null);
                  setPending(null);
                }}
              />
            ) : (
              <>
                {step === "creds" && (
                  <>
                    <header className="px-7 pt-4 pb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e0b968]">{t("login.step")}</p>
                      <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.title")}</h2>
                    </header>
                    <form className="px-7 pb-4 space-y-4" onSubmit={(e) => { e.preventDefault(); submitCreds(); }}>
                      <div>
                        <label className={label}>{t("login.id")}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40"><IcUser c="w-4 h-4" /></span>
                          <input className={`${field} pl-9`} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="USR-XXXXX / name@court.gov" autoFocus />
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
                      {err && <p className="text-[12.5px] text-[#f0a48f] border-l-2 border-crimson pl-3">{err}</p>}
                      <Btn type="submit" disabled={empty} className="w-full !py-3 !text-[13px]"><IcKey c="w-4 h-4" /> {t("login.continue")}</Btn>
                    </form>

                    <footer className="px-7 pb-5">
                      {empty ? (
                        <div className="border border-dashed border-navyline bg-navy2/40 px-4 py-3.5 text-center">
                          <p className="text-[12.5px] text-paper/70 leading-relaxed">{t("login.noAccounts")}</p>
                          <Btn kind="green" className="mt-3" onClick={() => setMode("signup")}><IcUser c="w-3.5 h-3.5" /> {t("login.goSignup")}</Btn>
                        </div>
                      ) : (
                        <>
                          {/* role filter + principal picker */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <label className="font-mono uppercase tracking-[0.14em] text-[9.5px] text-paper/50 shrink-0" htmlFor="roleFilter">{t("login.roleLbl")}</label>
                            <select
                              id="roleFilter"
                              value={roleFilter}
                              onChange={(e) => setRoleFilter(e.target.value as "ALL" | RoleId)}
                              className="flex-1 bg-navy2/60 border border-navyline px-2 py-2 font-mono text-[10.5px] uppercase text-paper/80 focus:outline-none focus:border-[#e0b968] transition-colors"
                            >
                              <option value="ALL">{t("login.allRoles")}</option>
                              {ALL_ROLES.map((r) => (
                                <option key={r} value={r}>{t(`role.${r}`)}</option>
                              ))}
                            </select>
                          </div>
                          <div className="relative">
                            <button onClick={() => setPickOpen((o) => !o)} className="w-full flex items-center justify-between border border-navyline px-3 py-2.5 text-[11.5px] text-paper/60 hover:text-paper hover:border-paper/40 transition-colors">
                              <span className="font-mono uppercase tracking-[0.14em] text-[9.5px]">
                                {t("login.principals")} · {filteredPrincipals.length}
                              </span>
                              <span className={`transition-transform ${pickOpen ? "rotate-180" : ""}`}><IcChevD c="w-3.5 h-3.5" /></span>
                            </button>
                            {pickOpen && (
                              <ul className="modal-in absolute left-0 right-0 bottom-full mb-1 bg-navy border border-navyline rounded-lg shadow-xl shadow-black/40 z-20 max-h-56 overflow-y-auto">
                                {filteredPrincipals.map((u) => (
                                  <li key={u.id}>
                                    <button onClick={() => { setUserId(u.id); setPickOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-navy2 transition-colors">
                                      <span className={`w-1.5 h-6 ${TONE_BG[ROLE_BANNER[u.role].tone]}`} />
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-[12.5px] font-semibold leading-tight">{u.name}</span>
                                        <span className="block font-mono text-[9px] uppercase tracking-widest text-paper/45">{t(`role.${u.role}`)} · {u.id}</span>
                                      </span>
                                      {u.status === "SUSPENDED" && <span className="font-mono text-[8.5px] uppercase text-crimson">suspended</span>}
                                    </button>
                                  </li>
                                ))}
                                {filteredPrincipals.length === 0 && (
                                  <li className="px-3 py-4 text-center font-mono text-[9.5px] uppercase tracking-widest text-paper/40">—</li>
                                )}
                              </ul>
                            )}
                          </div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/35 mt-3 text-center">{t("login.lockNote")}</p>
                        </>
                      )}
                    </footer>
                  </>
                )}

                {step === "mfa" && (
                  <>
                    <header className="px-7 pt-4 pb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e0b968]">{t("login.step")}</p>
                      <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.mfaTitle")}</h2>
                      <p className="text-[12.5px] text-paper/55 mt-1.5">{t("login.mfaSub")}</p>
                    </header>
                    <form className="px-7 pb-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitMfa(); }}>
                      <input
                        className="w-full bg-navy2/60 border border-navyline px-3 py-3 text-center font-mono text-[26px] tracking-[0.5em] text-paper focus:outline-none focus:border-[#e0b968] transition-colors"
                        value={mfaInput}
                        onChange={(e) => setMfaInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="······"
                        inputMode="numeric"
                        autoFocus
                        aria-label={t("login.mfaTitle")}
                      />
                      <div className="border border-dashed border-navyline bg-navy2/40 px-3 py-2 flex items-center justify-between">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/50">{t("login.demoCode")}</span>
                        <span className="font-mono text-[15px] font-bold text-green2 tracking-[0.3em]">{mfaCode}</span>
                      </div>
                      {err && <p className="text-[12.5px] text-[#f0a48f] border-l-2 border-crimson pl-3">{err}</p>}
                      <div className="flex gap-2">
                        <Btn kind="ghost" onClick={() => { setStep("creds"); setMfaInput(""); setErr(null); }} className="!text-paper/70 !border-navyline hover:!border-paper/40">{t("act.back")}</Btn>
                        <Btn type="submit" disabled={mfaInput.length !== 6} className="flex-1"><IcLock c="w-4 h-4" /> {t("login.verify")}</Btn>
                      </div>
                    </form>
                  </>
                )}

                {step === "bio" && pending && <BiometricStep userName={pending.name} onMatch={onBioMatch} />}

                <footer className="px-7 py-3.5 flex items-center gap-2 justify-center border-t border-navyline">
                  <span className="w-1.5 h-1.5 bg-green2 pulse-dot" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">{t("login.tls")}</p>
                </footer>
              </>
            )}
          </div>

          {p.onBackToLanding && (
            <button
              onClick={p.onBackToLanding}
              className="mt-4 mx-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45 hover:text-paper transition-colors"
            >
              ← {lang === "hi" ? "मुख्य पृष्ठ पर लौटें" : "Back to landing page"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Create account — role dropdown · founding registrar when empty      */
/* ================================================================== */
function SignupForm({ p, empty, onCreated }: { p: Props; empty: boolean; onCreated: (email: string) => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>(empty ? "ADMIN" : "VICTIM");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [stationId, setStationId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const okPw = pw.length >= 8;
  const valid = name.trim().length >= 3 && email.includes("@") && okPw && pw === pw2 && (role !== "POLICE" || stationId.trim().length > 1);

  const submit = () => {
    if (!valid) {
      setErr(!okPw ? "Password must be at least 8 characters." : pw !== pw2 ? "Passwords do not match." : "Complete all fields.");
      setShake((s) => s + 1);
      return;
    }
    const ok = p.onSignup({ name: name.trim(), role, email: email.trim(), password: pw, courtIds: [], stationId: stationId.trim() });
    if (!ok) {
      setErr(t("signup.dupe"));
      setShake((s) => s + 1);
      return;
    }
    onCreated(email.trim());
  };

  return (
    <div key={shake} className={shake ? "shake-x" : ""}>
      <header className="px-7 pt-5 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-green2">{empty ? t("firstrun.kicker") : t("signup.kicker")}</p>
        <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("signup.title")}</h2>
        <p className="text-[12.5px] text-paper/55 leading-relaxed mt-1.5">
          {empty ? t("signup.foundingNote") : t("signup.lede")}
        </p>
      </header>
      <form className="px-7 pb-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div>
          <label className={label}>{t("signup.roleLbl")}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40"><IcUser c="w-4 h-4" /></span>
            <select
              className={`${field} !bg-navy2/90 pl-9 pr-9 appearance-none cursor-pointer`}
              value={role}
              disabled={empty}
              onChange={(e) => setRole(e.target.value as RoleId)}
              aria-label={t("signup.roleLbl")}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{t(`role.${r}`)}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IcChevD c="w-3.5 h-3.5" /></span>
          </div>
          {empty && <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber2 mt-1.5">{t("signup.foundingNote")}</p>}
        </div>
        <div>
          <label className={label}>{t("firstrun.name")}</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("signup.namePh")} />
        </div>
        <div>
          <label className={label}>{t("firstrun.email")}</label>
          <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("signup.emailPh")} />
        </div>
        {role === "POLICE" && !empty && (
          <div>
            <label className={label}>{t("signup.stationLbl")}</label>
            <input className={field} value={stationId} onChange={(e) => setStationId(e.target.value)} placeholder="PS-…" />
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>{t("firstrun.pw")}</label>
            <input className={field} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className={label}>{t("firstrun.pw2")}</label>
            <input className={field} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
        <Btn type="submit" kind="green" disabled={!valid} className="w-full !py-3 !text-[13px]">
          <IcUser c="w-4 h-4" /> {t("signup.submit")}
        </Btn>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/40 text-center leading-relaxed">{t("signup.3faNote")}</p>
      </form>
    </div>
  );
}
