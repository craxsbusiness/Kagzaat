import { useMemo, useState } from "react";
import type { LoginEvent, User } from "../data";
import { ROLE_BANNER, ROLE_LABEL, SEC_QUESTIONS, keyFingerprint } from "../data";
import { deviceInfo, hashPassword, hashSecret, uid } from "../lib";
import { Btn, useToast } from "../ui";
import { usePrefs, useT } from "../i18n";
import { IcCheck, IcChevD, IcFinger, IcKey, IcLock, IcShield, IcUser, IcX } from "../icons";

interface Props {
  users: User[];
  onLogin: (userId: string, device: string, ip: string) => void;
  logLoginEvent: (ev: Omit<LoginEvent, "id" | "ts">) => void;
  onCreateFirstAdmin: (u: User) => void;
  onSignup: (p: { name: string; role: "VICTIM" | "ACCUSED"; email: string; password: string; secQuestion: string; secAnswer: string }) => boolean;
  pushSecurity?: (severity: "INFO" | "WARN" | "CRITICAL", kind: string, detail: string, userId?: string) => void;
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

const field = "w-full bg-navy2/60 border border-navyline px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-[#e5a09a] transition-colors";
const label = "font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper/55 block mb-1.5";

export default function Login(p: Props) {
  if (p.users.length === 0) {
    return <FirstRun {...p} />;
  }
  return <Gateway {...p} />;
}

/* ================================================================== */
/* First-run provisioning — registry starts empty                      */
/* ================================================================== */
function FirstRun({ onCreateFirstAdmin }: Props) {
  const t = useT();
  const { lang } = usePrefs();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [unit, setUnit] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [qIdx, setQIdx] = useState(0);
  const [qCustom, setQCustom] = useState(false);
  const [qText, setQText] = useState("");
  const [ans, setAns] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const okPw = pw.length >= 8;
  const okQ = !qCustom || qText.trim().length >= 6;
  const valid = name.trim().length >= 3 && email.includes("@") && okPw && pw === pw2 && okQ && ans.trim().length >= 2;

  const submit = () => {
    if (!valid) {
      setErr(!okPw ? "Password must be at least 8 characters." : pw !== pw2 ? "Passwords do not match." : !okQ ? "Write your custom question." : "Complete all fields to provision the registry.");
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
      secQuestion: qCustom ? qText.trim() : SEC_QUESTIONS[qIdx][lang],
      secAnswerHash: hashSecret(ans),
    });
  };

  return (
    <div className="min-h-screen ambient-login text-paper flex items-center justify-center p-6 relative overflow-hidden">
      <div className="scanline absolute inset-0 pointer-events-none" />
      <div className="w-full max-w-2xl relative z-10 rise">
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
            <p className="text-[13px] text-paper/60 leading-relaxed mt-2">{t("firstrun.lede")}</p>
          </header>
          <form className="px-7 py-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{t("firstrun.name")}</label>
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{t("firstrun.secQ")}</label>
                <select className={field} value={qCustom ? "custom" : String(qIdx)} onChange={(e) => { if (e.target.value === "custom") setQCustom(true); else { setQCustom(false); setQIdx(Number(e.target.value)); } }}>
                  {SEC_QUESTIONS.map((qq, i) => <option key={i} value={i}>{qq[lang]}</option>)}
                  <option value="custom">{t("signup.secCustom")}</option>
                </select>
                {qCustom && <input className={`${field} mt-2`} value={qText} onChange={(e) => setQText(e.target.value)} placeholder={t("signup.secCustomPh")} />}
              </div>
              <div>
                <label className={label}>{t("firstrun.secA")}</label>
                <input className={field} value={ans} onChange={(e) => setAns(e.target.value)} placeholder="••••••" />
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40 mt-1.5">{t("signup.ansHint")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={`w-2 h-2 ${okPw ? "bg-green2" : "bg-amber2"}`} />
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/55">{t("firstrun.argon")}</p>
            </div>
            {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
            <Btn type="submit" disabled={!valid} className="w-full !py-3 !text-[13px]">
              <IcFinger c="w-4 h-4" /> {t("firstrun.submit")}
            </Btn>
          </form>
        </div>
        <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.22em] text-paper/35 mt-5">{t("firstrun.after")}</p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Factor stepper — 1 password · 2 code · 3 security answer            */
/* ================================================================== */
function FactorSteps({ step, total }: { step: 1 | 2 | 3; total: 2 | 3 }) {
  const t = useT();
  const factors: { key: string; icon: React.ReactNode }[] = [
    { key: "login.f1", icon: <IcKey c="w-3.5 h-3.5" /> },
    { key: "login.f2", icon: <IcFinger c="w-3.5 h-3.5" /> },
    { key: "login.f3", icon: <IcShield c="w-3.5 h-3.5" /> },
  ].slice(0, total);
  return (
    <div className="flex items-center px-7 pt-5">
      {factors.map((f, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < step;
        const active = n === step;
        return (
          <div key={f.key} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 transition-colors ${active ? "text-[#e5a09a]" : done ? "text-green2" : "text-paper/35"}`}>
              <span className={`w-7 h-7 border flex items-center justify-center transition-all ${active ? "border-[#e5a09a] bg-crimson/20 pulse-red" : done ? "border-green2/60 bg-green/15" : "border-navyline"}`}>
                {done ? <IcCheck c="w-3.5 h-3.5" /> : f.icon}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] whitespace-nowrap">
                {n} · {t(f.key)}
              </span>
            </div>
            {i < factors.length - 1 && <span className={`flex-1 h-px mx-2 transition-colors ${done ? "bg-green2/50" : "bg-navyline"}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* Gateway — sign in (3 factors) / create account                      */
/* ================================================================== */
function Gateway(p: Props) {
  const t = useT();
  const { lang } = usePrefs();
  const toast = useToast();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"creds" | "mfa" | "sec">("creds");
  const [pending, setPending] = useState<User | null>(null);

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
  const [secInput, setSecInput] = useState("");
  const [secFails, setSecFails] = useState(0);

  const device = useMemo(() => deviceInfo(), []);
  const ip = useMemo(() => `10.14.2.${Math.floor(20 + Math.random() * 60)}`, []);

  const total: 2 | 3 = pending?.secQuestion ? 3 : 2;
  const stepN: 1 | 2 | 3 = step === "creds" ? 1 : step === "mfa" ? 2 : 3;

  const fail = (msg: string) => {
    setErr(msg);
    setShake((s) => s + 1);
  };

  const findUser = (needleRaw: string) => {
    const needle = needleRaw.trim().toLowerCase();
    return p.users.find((x) => x.id.toLowerCase() === needle || x.email.toLowerCase() === needle);
  };

  /* ---------------- factor 1 · password ---------------- */
  const submitCreds = () => {
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      fail(`Account locked — retry in ${Math.ceil((lockUntil - now) / 1000)}s`);
      return;
    }
    const u = findUser(userId);
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
    toast("info", "Factor 1 passed — MFA challenge issued", "6-digit code dispatched (demo code shown below).");
  };

  /* ---------------- factor 2 · one-time code ---------------- */
  const submitMfa = () => {
    const u = pending!;
    if (mfaInput !== mfaCode) {
      p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_FAIL", device, ip, location: "Gateway", note: "Incorrect TOTP" });
      setShake((s) => s + 1);
      setErr("Incorrect verification code. Ledgered as MFA_FAIL.");
      return;
    }
    p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_OK", device, ip, location: "Gateway", note: "TOTP accepted" });
    setErr(null);
    if (u.secQuestion && u.secAnswerHash) {
      setStep("sec");
      toast("info", "Factor 2 passed — security answer required", "One more factor before entry.");
    } else {
      p.onLogin(u.id, device, ip);
    }
  };

  /* ---------------- factor 3 · security answer ---------------- */
  const submitSec = () => {
    const u = pending!;
    if (hashSecret(secInput) !== u.secAnswerHash) {
      const next = secFails + 1;
      setSecFails(next);
      p.logLoginEvent({ userId: u.id, userName: u.name, kind: "FA3_FAIL", device, ip, location: "Gateway", note: `Incorrect security answer · attempt ${next} of 3` });
      setShake((s) => s + 1);
      if (next >= 3) {
        setLockUntil(Date.now() + 30000);
        p.logLoginEvent({ userId: u.id, userName: u.name, kind: "LOCKOUT", device, ip, location: "Gateway", note: "3 failed security answers — lockout applied" });
        p.pushSecurity?.("WARN", "FA3_BRUTE", `3 failed security answers for ${u.id} from ${ip}`, u.id);
        setSecFails(0);
        setStep("creds");
        setPending(null);
        setSecInput("");
        setMfaInput("");
        fail(t("login.secLock"));
      } else {
        setErr(`${t("login.secWrong")} (${next}/3)`);
      }
      return;
    }
    p.logLoginEvent({ userId: u.id, userName: u.name, kind: "FA3_OK", device, ip, location: "Gateway", note: "Security answer verified · 3rd factor" });
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

        <div className="mt-14 relative z-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e5a09a]">{t("login.3fa")}</p>
          <h1 className="font-display font-semibold uppercase leading-[1.04] text-[46px] tracking-wide mt-3">
            {t("login.h1a")}
            <br />
            {t("login.h1b")}
          </h1>
          <p className="text-[14px] text-paper/65 leading-relaxed mt-5 max-w-md">{t("login.lede")}</p>
        </div>

        {/* the three factors, visualised */}
        <div className="mt-10 relative z-10 max-w-md">
          {[
            { n: 1, k: "login.f1", v: "login.k1v", icon: <IcKey c="w-4 h-4" /> },
            { n: 2, k: "login.f2", v: "login.k3v", icon: <IcFinger c="w-4 h-4" /> },
            { n: 3, k: "login.f3", v: "login.k4v", icon: <IcShield c="w-4 h-4" /> },
          ].map((f, i) => (
            <div key={f.n} className="rise flex items-center gap-3 border border-navyline bg-navy2/40 px-4 py-2.5 mb-2" style={{ animationDelay: `${i * 110}ms` }}>
              <span className="w-8 h-8 border border-[#e5a09a]/50 text-[#e5a09a] flex items-center justify-center shrink-0">{f.icon}</span>
              <div>
                <p className="font-display font-semibold uppercase tracking-[0.14em] text-[12px]">{f.n} · {t(f.k)}</p>
                <p className="font-mono text-[9.5px] text-paper/50 mt-0.5">{t(f.v)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto relative z-10 grid grid-cols-2 gap-3 max-w-md">
          {[
            ["login.k1", "login.k1v"],
            ["login.k2", "login.k2v"],
            ["login.k3", "login.k3v"],
            ["login.k4", "login.k4v"],
          ].map(([k, v], i) => (
            <div key={k} className="rise border border-navyline bg-navy2/40 px-3.5 py-3" style={{ animationDelay: `${i * 90}ms` }}>
              <p className="font-display font-semibold uppercase tracking-[0.14em] text-[11px] text-[#e5a09a]">{t(k)}</p>
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

          <div key={shake} className={`bg-navy/80 border border-navyline backdrop-blur-sm ${shake ? "shake-x" : ""}`}>
            {/* LOGIN / SIGNUP tabs */}
            <div className="grid grid-cols-2 border-b border-navyline" role="tablist">
              <button
                role="tab"
                aria-selected={mode === "signin"}
                onClick={() => { setMode("signin"); setErr(null); }}
                className={`font-display font-semibold uppercase tracking-[0.14em] text-[13px] py-3.5 transition-colors border-b-2 ${
                  mode === "signin" ? "text-paper border-crimson bg-navy2/50" : "text-paper/45 border-transparent hover:text-paper/80"
                }`}
              >
                {t("login.tab.signin")}
              </button>
              <button
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => { setMode("signup"); setErr(null); }}
                className={`font-display font-semibold uppercase tracking-[0.14em] text-[13px] py-3.5 transition-colors border-b-2 ${
                  mode === "signup" ? "text-paper border-green2 bg-navy2/50" : "text-paper/45 border-transparent hover:text-paper/80"
                }`}
              >
                {t("login.tab.signup")}
              </button>
            </div>

            {mode === "signup" ? (
              <SignupForm p={p} onCreated={(email) => { setMode("signin"); setUserId(email); setStep("creds"); setErr(null); setPending(null); }} />
            ) : (
              <>
                <FactorSteps step={stepN} total={pending ? total : 3} />
                {step === "creds" && (
                  <>
                    <header className="px-7 pt-4 pb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e5a09a]">{t("login.step")} — {t("login.f1")}</p>
                      <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.title")}</h2>
                    </header>
                    <form className="px-7 pb-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitCreds(); }}>
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
                      {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
                      <Btn type="submit" className="w-full !py-3 !text-[13px]"><IcKey c="w-4 h-4" /> {t("login.continue")}</Btn>
                    </form>
                    <footer className="px-7 pb-5">
                      <div className="relative">
                        <button onClick={() => setPickOpen((o) => !o)} className="w-full flex items-center justify-between border border-navyline px-3 py-2.5 text-[11.5px] text-paper/60 hover:text-paper hover:border-paper/40 transition-colors">
                          <span className="font-mono uppercase tracking-[0.14em] text-[9.5px]">{t("login.principals")} · {p.users.length}</span>
                          <span className={`transition-transform ${pickOpen ? "rotate-180" : ""}`}><IcChevD c="w-3.5 h-3.5" /></span>
                        </button>
                        {pickOpen && (
                          <ul className="modal-in absolute left-0 right-0 bottom-full mb-1 bg-navy border border-navyline shadow-xl shadow-black/40 z-20 max-h-56 overflow-y-auto">
                            {p.users.map((u) => (
                              <li key={u.id}>
                                <button onClick={() => { setUserId(u.id); setPickOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-navy2 transition-colors">
                                  <span className={`w-1.5 h-6 ${TONE_BG[ROLE_BANNER[u.role].tone]}`} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[12.5px] font-semibold leading-tight">{u.name}</span>
                                    <span className="block font-mono text-[9px] uppercase tracking-widest text-paper/45">{ROLE_LABEL[u.role]} · {u.id}</span>
                                  </span>
                                  {u.status === "SUSPENDED" && <span className="font-mono text-[8.5px] uppercase text-crimson">suspended</span>}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/35 mt-3 text-center">{t("login.lockNote")}</p>
                    </footer>
                  </>
                )}

                {step === "mfa" && (
                  <>
                    <header className="px-7 pt-4 pb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e5a09a]">{t("login.mfaStep")}</p>
                      <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.mfaTitle")}</h2>
                      <p className="text-[12px] text-paper/55 mt-1.5">{t("login.mfaSub")}</p>
                    </header>
                    <form className="px-7 pb-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitMfa(); }}>
                      <input
                        className="w-full bg-navy2/60 border border-navyline px-3 py-3 text-center font-mono text-[26px] tracking-[0.5em] text-paper focus:outline-none focus:border-[#e5a09a] transition-colors"
                        value={mfaInput}
                        onChange={(e) => setMfaInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="······"
                        inputMode="numeric"
                        autoFocus
                      />
                      <div className="border border-dashed border-navyline bg-navy2/40 px-3 py-2 flex items-center justify-between">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/50">{t("login.demoCode")}</span>
                        <span className="font-mono text-[15px] font-bold text-green2 tracking-[0.3em]">{mfaCode}</span>
                      </div>
                      {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
                      <div className="flex gap-2">
                        <Btn kind="ghost" onClick={() => { setStep("creds"); setMfaInput(""); setErr(null); }} className="!text-paper/70 !border-navyline hover:!border-paper/40">{t("act.back")}</Btn>
                        <Btn type="submit" disabled={mfaInput.length !== 6} className="flex-1"><IcFinger c="w-4 h-4" /> {t("login.verify")}</Btn>
                      </div>
                    </form>
                  </>
                )}

                {step === "sec" && pending && (
                  <>
                    <header className="px-7 pt-4 pb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e5a09a]">{t("login.step")} 3 {t("login.ofN")} 3 · {t("login.f3")}</p>
                      <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.secTitle")}</h2>
                      <p className="text-[12px] text-paper/55 mt-1.5">{t("login.secSub")}</p>
                    </header>
                    <form className="px-7 pb-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitSec(); }}>
                      <div className="border border-navyline bg-navy2/40 px-4 py-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/45 mb-1">{t("login.secTitle")}</p>
                        <p className="text-[14.5px] font-semibold leading-snug">{pending.secQuestion}</p>
                      </div>
                      <input
                        className={field}
                        type="password"
                        value={secInput}
                        onChange={(e) => setSecInput(e.target.value)}
                        placeholder={t("login.secPh")}
                        autoFocus
                      />
                      {err && <p className="text-[12.5px] text-[#e5a09a] border-l-2 border-crimson pl-3">{err}</p>}
                      <div className="flex gap-2">
                        <Btn kind="ghost" onClick={() => { setStep("mfa"); setSecInput(""); setErr(null); }} className="!text-paper/70 !border-navyline hover:!border-paper/40">{t("act.back")}</Btn>
                        <Btn type="submit" disabled={secInput.trim().length < 1} className="flex-1"><IcShield c="w-4 h-4" /> {t("login.verify")}</Btn>
                      </div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/35 text-center">{t("signup.ansHint")}</p>
                    </form>
                  </>
                )}

                <footer className="px-7 pb-4 flex items-center gap-2 justify-center border-t border-navyline pt-3.5">
                  <span className="w-1.5 h-1.5 bg-green2 pulse-dot" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">{t("login.tls")}</p>
                </footer>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Public self-signup — parties & citizens                             */
/* ================================================================== */
function SignupForm({ p, onCreated }: { p: Props; onCreated: (email: string) => void }) {
  const t = useT();
  const { lang } = usePrefs();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"VICTIM" | "ACCUSED">("VICTIM");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [qIdx, setQIdx] = useState(0);
  const [qCustom, setQCustom] = useState(false);
  const [qText, setQText] = useState("");
  const [ans, setAns] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const okPw = pw.length >= 8;
  const okQ = !qCustom || qText.trim().length >= 6;
  const valid = name.trim().length >= 3 && email.includes("@") && okPw && pw === pw2 && okQ && ans.trim().length >= 2;

  const submit = () => {
    if (!valid) {
      setErr(!okPw ? "Password must be at least 8 characters." : pw !== pw2 ? "Passwords do not match." : !okQ ? "Write your custom question." : "Complete all fields.");
      setShake((s) => s + 1);
      return;
    }
    const ok = p.onSignup({ name: name.trim(), role, email: email.trim(), password: pw, secQuestion: qCustom ? qText.trim() : SEC_QUESTIONS[qIdx][lang], secAnswer: ans });
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
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-green2">{t("signup.kicker")}</p>
        <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("signup.title")}</h2>
        <p className="text-[12px] text-paper/55 leading-relaxed mt-1.5">{t("signup.lede")}</p>
      </header>
      <form className="px-7 pb-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div>
          <label className={label}>{t("firstrun.name")}</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("signup.namePh")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>{t("signup.role")}</label>
            <div className="grid grid-cols-2 gap-2">
              {(["VICTIM", "ACCUSED"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`font-mono text-[10px] uppercase tracking-wide px-2 py-2.5 border transition-colors ${role === r ? "bg-green/20 text-green2 border-green2/60" : "bg-navy2/60 text-paper/55 border-navyline hover:border-paper/40"}`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>{t("firstrun.email")}</label>
            <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("signup.emailPh")} />
          </div>
        </div>
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
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>{t("firstrun.secQ")}</label>
            <select className={field} value={qCustom ? "custom" : String(qIdx)} onChange={(e) => { if (e.target.value === "custom") setQCustom(true); else { setQCustom(false); setQIdx(Number(e.target.value)); } }}>
              {SEC_QUESTIONS.map((qq, i) => <option key={i} value={i}>{qq[lang]}</option>)}
              <option value="custom">{t("signup.secCustom")}</option>
            </select>
            {qCustom && <input className={`${field} mt-2`} value={qText} onChange={(e) => setQText(e.target.value)} placeholder={t("signup.secCustomPh")} />}
          </div>
          <div>
            <label className={label}>{t("firstrun.secA")}</label>
            <input className={field} type="password" value={ans} onChange={(e) => setAns(e.target.value)} placeholder="••••••" />
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40 mt-1.5">{t("signup.ansHint")}</p>
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
