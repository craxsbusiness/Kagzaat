import { useEffect, useMemo, useRef, useState } from "react";
import type { LoginEvent, RoleId, User } from "../data";
import { SEC_QUESTIONS } from "../data";
import { deviceInfo, hashPassword, hashSecret } from "../lib";
import { generateOTPAuthURI, generateRecoveryCodes, generateSecret, verifyRecoveryCode, verifyTOTP } from "../totp";
import { Btn, useCopy, useToast } from "../ui";
import { usePrefs, useT } from "../i18n";
import { IcCheck, IcChevD, IcCopy, IcKey, IcLock, IcShield, IcUser, IcX } from "../icons";
import QRCode from "qrcode";

interface Props {
  users: User[];
  initialMode?: "signin" | "signup";
  magicReturnId?: string | null;
  onLogin: (userId: string, device: string, ip: string) => void;
  logLoginEvent: (ev: Omit<LoginEvent, "id" | "ts">) => void;
  /** returns the new person code, or null if the email is already registered */
  onSignup: (p: { name: string; role: RoleId; email: string; phone: string; password: string; secQuestion: string; secAnswer: string }) => string | null;
  /** saves TOTP secret and recovery codes for a user */
  onSaveTOTP: (userId: string, secret: string, recoveryCodes: string[]) => void;
  pushSecurity?: (severity: "INFO" | "WARN" | "CRITICAL", kind: string, detail: string, userId?: string) => void;
  onBackToLanding?: () => void;
  notice?: string | null;
}

const ALL_ROLES: RoleId[] = ["JUDGE", "LAWYER", "ACCUSED", "VICTIM", "POLICE", "ADMIN", "AUDITOR"];

const field = "w-full bg-navy2/60 border border-navyline px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-[#e0b968] transition-colors";
const label = "font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper/55 block mb-1.5";

const PHONE_RE = /^[+]?[\d\s\-()]{8,17}$/;

export default function Login(p: Props) {
  return <Gateway {...p} />;
}

/* ================================================================== */
/* Gateway — Sign in / Create account                                  */
/* ================================================================== */
function Gateway(p: Props) {
  const t = useT();
  const { lang } = usePrefs();
  const toast = useToast();
  const empty = p.users.length === 0;

  const [mode, setMode] = useState<"signin" | "signup">(p.initialMode ?? (empty ? "signup" : "signin"));
  const [step, setStep] = useState<"creds" | "otp" | "sec" | "setup">("creds");
  const [pending, setPending] = useState<User | null>(null);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; recoveryCodes: string[] } | null>(null);

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [fails, setFails] = useState(0);
  const [secFails, setSecFails] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [otpSending, setOtpSending] = useState(false);

  const [demoCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [otpInput, setOtpInput] = useState("");
  const [secInput, setSecInput] = useState("");

  const device = useMemo(() => deviceInfo(), []);
  const ip = useMemo(() => `10.14.2.${Math.floor(20 + Math.random() * 60)}`, []);

  const fail = (msg: string) => {
    setErr(msg);
    setShake((s) => s + 1);
  };

  const backToCreds = () => {
    setStep("creds");
    setPending(null);
    setOtpInput("");
    setSecInput("");
    setErr(null);
  };

  /* magic-link return — App captured #access_token and resolved the principal;
     skip straight to the security question */
  const magicHandled = useRef(false);
  useEffect(() => {
    if (p.magicReturnId && !magicHandled.current) {
      const u = p.users.find((x) => x.id === p.magicReturnId);
      if (u && u.status === "ACTIVE") {
        magicHandled.current = true;
        setPending(u);
        setStep("sec");
        p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_OK", device, ip, location: "Gateway", note: "Email verification link followed · factor 2 completed" });
        toast("success", t("login.linkOk"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.magicReturnId]);

  /* ---------------- step 1 · password ---------------- */
  const submitCreds = async () => {
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      fail(`Account locked — retry in ${Math.ceil((lockUntil - now) / 1000)}s`);
      return;
    }
    const needle = userId.trim().toLowerCase();
    const u = p.users.find((x) => x.id.toLowerCase() === needle || x.email.toLowerCase() === needle || (x.personCode ?? "").toLowerCase() === needle);
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

    /* step 2 · TOTP authenticator code */
    setStep("otp");
  };

  /* ---------------- step 2 · TOTP verification ---------------- */
  const submitOtp = async () => {
    const u = pending!;
    
    /* first-time TOTP setup */
    if (!u.totpSecret) {
      const secret = generateSecret();
      const recoveryCodes = generateRecoveryCodes();
      p.onSaveTOTP(u.id, secret, recoveryCodes);
      setTotpSetup({ secret, recoveryCodes });
      setStep("setup");
      return;
    }

    /* verify TOTP code */
    const valid = await verifyTOTP(u.totpSecret, otpInput);
    if (!valid) {
      /* check recovery codes */
      const rcResult = verifyRecoveryCode(otpInput, u.recoveryCodesHashed ?? []);
      if (!rcResult.valid) {
        p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_FAIL", device, ip, location: "Gateway", note: "Incorrect TOTP or recovery code" });
        setShake((s) => s + 1);
        setErr("Incorrect code. Ledgered as MFA_FAIL.");
        return;
      }
      /* recovery code used - mark it as consumed */
      const newHashes = [...(u.recoveryCodesHashed ?? [])];
      newHashes.splice(rcResult.index, 1);
      p.onSaveTOTP(u.id, u.totpSecret, newHashes);
      p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_OK", device, ip, location: "Gateway", note: "Recovery code verified" });
    } else {
      p.logLoginEvent({ userId: u.id, userName: u.name, kind: "MFA_OK", device, ip, location: "Gateway", note: "TOTP code verified" });
    }

    setErr(null);
    setOtpInput("");
    if (u.secQuestion && u.secAnswerHash) {
      setStep("sec");
    } else {
      p.onLogin(u.id, device, ip);
    }
  };

  /* ---------------- step 3 · secret answer ---------------- */
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
        backToCreds();
        fail(t("login.secLock"));
      } else {
        setErr(`${t("login.secWrong")} (${next}/3)`);
      }
      return;
    }
    p.logLoginEvent({ userId: u.id, userName: u.name, kind: "FA3_OK", device, ip, location: "Gateway", note: "Security answer verified" });
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
            <div className="grid grid-cols-2 border-b border-navyline" role="tablist" aria-label="Authentication mode">
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
                  backToCreds();
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
                    <form className="px-7 pb-4 space-y-4" onSubmit={(e) => { e.preventDefault(); void submitCreds(); }}>
                      <div>
                        <label className={label}>{t("login.id")}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40"><IcUser c="w-4 h-4" /></span>
                          <input className={`${field} pl-9`} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={t("login.idPh")} autoFocus />
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
                      <Btn type="submit" disabled={empty || otpSending} className="w-full !py-3 !text-[13px]">
                        <IcKey c="w-4 h-4" /> {otpSending ? "…" : t("login.continue")}
                      </Btn>
                    </form>

                    <footer className="px-7 pb-5">
                      {empty ? (
                        <div className="border border-dashed border-navyline bg-navy2/40 px-4 py-3.5 text-center">
                          <p className="text-[12.5px] text-paper/70 leading-relaxed">{t("login.noAccounts")}</p>
                          <Btn kind="green" className="mt-3" onClick={() => setMode("signup")}><IcUser c="w-3.5 h-3.5" /> {t("login.goSignup")}</Btn>
                        </div>
                      ) : (
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/35 mt-3 text-center">{t("login.lockNote")}</p>
                      )}
                    </footer>
                  </>
                )}

                {step === "otp" && (
                  <>
                    <header className="px-7 pt-4 pb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e0b968]">{t("login.step")}</p>
                      <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.mfaTitle")}</h2>
                      <p className="text-[12.5px] text-paper/55 mt-1.5">{t("login.mfaSub")}</p>
                    </header>
                    <form className="px-7 pb-5 space-y-4" onSubmit={(e) => { e.preventDefault(); void submitOtp(); }}>
                      <input
                        className="w-full bg-navy2/60 border border-navyline px-3 py-3 text-center font-mono text-[26px] tracking-[0.5em] text-paper focus:outline-none focus:border-[#e0b968] transition-colors"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="······"
                        inputMode="numeric"
                        autoFocus
                        aria-label={t("login.mfaTitle")}
                      />
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40 text-center">
                        {pending?.totpSecret ? "Enter code from your authenticator app" : "First time? We'll set up your authenticator next"}
                      </p>
                      {err && <p className="text-[12.5px] text-[#f0a48f] border-l-2 border-crimson pl-3">{err}</p>}
                      <div className="flex gap-2">
                        <Btn kind="ghost" onClick={backToCreds} className="!text-paper/70 !border-navyline hover:!border-paper/40">{t("act.back")}</Btn>
                        <Btn type="submit" disabled={otpInput.length !== 6} className="flex-1"><IcLock c="w-4 h-4" /> {t("login.verify")}</Btn>
                      </div>
                    </form>
                  </>
                )}

                {step === "setup" && pending && totpSetup && (
                  <TotpSetup
                    user={pending}
                    secret={totpSetup.secret}
                    recoveryCodes={totpSetup.recoveryCodes}
                    onDone={() => {
                      setTotpSetup(null);
                      setStep("sec");
                    }}
                  />
                )}

                {step === "sec" && pending && (
                  <>
                    <header className="px-7 pt-4 pb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e0b968]">{t("login.step")}</p>
                      <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">{t("login.secTitle")}</h2>
                      <p className="text-[12.5px] text-paper/55 mt-1.5">{t("login.secSub")}</p>
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
                      {err && <p className="text-[12.5px] text-[#f0a48f] border-l-2 border-crimson pl-3">{err}</p>}
                      <div className="flex gap-2">
                        <Btn kind="ghost" onClick={() => { setStep("otp"); setSecInput(""); setErr(null); }} className="!text-paper/70 !border-navyline hover:!border-paper/40">{t("act.back")}</Btn>
                        <Btn type="submit" disabled={secInput.trim().length < 1} className="flex-1"><IcShield c="w-4 h-4" /> {t("login.verify")}</Btn>
                      </div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/35 text-center">{t("signup.ansHint")}</p>
                    </form>
                  </>
                )}

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
              <IcChevD c="w-3 h-3 rotate-90" /> {lang === "hi" ? "मुख पृष्ठ पर वापस" : "Back to landing page"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* TOTP Setup — QR code + recovery codes for first-time authenticator  */
/* ================================================================== */
function TotpSetup({ user, secret, recoveryCodes, onDone }: { user: User; secret: string; recoveryCodes: string[]; onDone: () => void }) {
  const t = useT();
  const { copied, copy } = useCopy();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const uri = generateOTPAuthURI(secret, user.email, "LexVault");
    QRCode.toDataURL(uri, { margin: 1, scale: 8 }).then(setQrDataUrl);
  }, [secret, user.email]);

  return (
    <div className="px-7 py-6 space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e0b968]">First-time setup</p>
        <h2 className="font-display font-semibold uppercase tracking-wide text-[22px] mt-1">Set up authenticator</h2>
        <p className="text-[12.5px] text-paper/55 mt-1.5">Scan this QR code with Google Authenticator, Authy, or any TOTP app</p>
      </div>

      <div className="flex justify-center">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 bg-paper p-2 rounded-lg" />
        ) : (
          <div className="w-48 h-48 bg-paper/10 rounded-lg flex items-center justify-center">
            <p className="text-paper/40 text-sm">Loading...</p>
          </div>
        )}
      </div>

      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/50 mb-1">Or enter manually:</p>
        <div className="flex items-center gap-2 bg-navy2/60 border border-navyline rounded-lg px-3 py-2">
          <code className="flex-1 font-mono text-[13px] text-[#e0b968] tracking-wider break-all">{secret}</code>
          <button
            onClick={() => copy(secret, "secret")}
            className="text-paper/50 hover:text-paper transition-colors"
            aria-label="Copy secret"
          >
            {copied === "secret" ? <IcCheck c="w-4 h-4 text-green2" /> : <IcCopy c="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/50 mb-2">Recovery codes (save these!):</p>
        <div className="bg-navy2/60 border border-navyline rounded-lg p-3 grid grid-cols-2 gap-2">
          {recoveryCodes.map((code, i) => (
            <code key={i} className="font-mono text-[11px] text-paper/70">{code}</code>
          ))}
        </div>
        <p className="text-[10px] text-paper/40 mt-2">Use these if you lose access to your authenticator app</p>
      </div>

      <Btn kind="green" className="w-full !py-3" onClick={onDone}>
        <IcCheck c="w-4 h-4" /> I've saved my codes — continue
      </Btn>
    </div>
  );
}

/* ================================================================== */
/* Create account — role dropdown, phone, secret question, person code */
/* ================================================================== */
function SignupForm({ p, empty, onCreated }: { p: Props; empty: boolean; onCreated: (email: string) => void }) {
  const t = useT();
  const { lang } = usePrefs();
  const toast = useToast();
  const { copied, copy } = useCopy();
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleId>(empty ? "ADMIN" : "VICTIM");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [qIdx, setQIdx] = useState(0);
  const [qCustom, setQCustom] = useState(false);
  const [qText, setQText] = useState("");
  const [ans, setAns] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [personCode, setPersonCode] = useState<string | null>(null);
  const [officialOpen, setOfficialOpen] = useState(false);
  const [officialCode, setOfficialCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const tryUnlock = () => {
    if (officialCode.trim() === "12345") {
      setUnlocked(true);
      setOfficialOpen(false);
      setErr(null);
      toast("success", t("signup.officialUnlocked"), t("signup.roleLbl"));
    } else {
      p.pushSecurity?.("WARN", "OFFICIAL_CODE_FAIL", "Incorrect official access code entered during public registration");
      setErr(t("signup.officialWrong"));
      setShake((s) => s + 1);
    }
  };

  const okPw = pw.length >= 8;
  const okPhone = PHONE_RE.test(phone.trim());
  const okQ = !qCustom || qText.trim().length >= 6;
  const valid =
    name.trim().length >= 3 && email.includes("@") && okPw && pw === pw2 && okPhone && okQ &&
    ans.trim().length >= 2;

  const submit = () => {
    if (!valid) {
      setErr(!okPw ? "Password must be at least 8 characters." : pw !== pw2 ? "Passwords do not match." : !okPhone ? t("signup.phoneBad") : !okQ ? "Write your custom question." : "Complete all fields.");
      setShake((s) => s + 1);
      return;
    }
    const code = p.onSignup({
      name: name.trim(),
      role,
      email: email.trim(),
      phone: phone.trim(),
      password: pw,
      secQuestion: qCustom ? qText.trim() : SEC_QUESTIONS[qIdx][lang],
      secAnswer: ans,
    });
    if (code === null) {
      setErr(t("signup.dupe"));
      setShake((s) => s + 1);
      return;
    }
    setPersonCode(code);
    toast("success", t("signup.codeTitle"), code);
  };

  /* -------- person-code reveal -------- */
  if (personCode) {
    return (
      <div className="px-7 py-7 text-center">
        <span className="inline-flex w-12 h-12 rounded-full bg-green/15 border border-green2/50 text-green2 items-center justify-center stamp-in">
          <IcCheck c="w-6 h-6" />
        </span>
        <h2 className="font-display font-semibold uppercase tracking-wide text-[21px] mt-4">{t("signup.codeTitle")}</h2>
        <p className="text-[12.5px] text-paper/60 leading-relaxed mt-2 max-w-xs mx-auto">{t("signup.codeBody")}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <p className="font-mono text-[26px] font-bold tracking-[0.22em] text-[#e0b968] bg-navy2/70 border border-navyline px-5 py-3 rounded-lg select-all">
            {personCode}
          </p>
          <button
            onClick={() => copy(personCode, "code")}
            className="w-11 h-11 rounded-lg border border-navyline text-paper/60 hover:text-paper hover:border-paper/40 transition-colors flex items-center justify-center"
            aria-label="Copy person code"
            title="Copy"
          >
            {copied === "code" ? <IcCheck c="w-4 h-4 text-green2" /> : <IcCopy c="w-4 h-4" />}
          </button>
        </div>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] mt-4 text-amber2">
          {t("signup.codeNotEmailed")}
        </p>
        <Btn kind="green" className="mt-6 w-full !py-3" onClick={() => onCreated(email.trim())}>
          {t("signup.codeProceed")}
        </Btn>
      </div>
    );
  }

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
          {empty ? (
            <div className={`${field} flex items-center gap-2 !py-3 text-paper/80`}>
              <IcUser c="w-4 h-4 text-[#e0b968]" />
              <span className="font-display uppercase tracking-[0.1em] text-[13px]">{t("role.ADMIN")}</span>
            </div>
          ) : !unlocked ? (
            <>
              {/* parties get exactly two choices */}
              <div className="grid grid-cols-2 gap-3">
                {(["VICTIM", "ACCUSED"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    aria-pressed={role === r}
                    className={`relative rounded-lg border px-3 py-3.5 text-left transition-all duration-150 ${
                      role === r
                        ? "border-[#e0b968] bg-[#e0b968]/10 shadow-[inset_0_-3px_0_#e0b968]"
                        : "border-navyline bg-navy2/50 hover:border-paper/40"
                    }`}
                  >
                    <span className={`font-display font-semibold uppercase tracking-[0.1em] text-[14px] block ${role === r ? "text-[#e0b968]" : "text-paper/85"}`}>
                      {t(`role.${r}`)}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/45 block mt-1">
                      {r === "VICTIM" ? t("signup.pickVictim") : t("signup.pickAccused")}
                    </span>
                    {role === r && (
                      <span className="absolute top-2 right-2 text-[#e0b968] stamp-in"><IcCheck c="w-3.5 h-3.5" /></span>
                    )}
                  </button>
                ))}
              </div>
              {/* officials need the access code */}
              {!officialOpen ? (
                <button
                  type="button"
                  onClick={() => setOfficialOpen(true)}
                  className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/45 hover:text-[#e0b968] transition-colors"
                >
                  {t("signup.officialLink")} →
                </button>
              ) : (
                <div className="mt-2 modal-in border border-navyline rounded-lg bg-navy2/50 p-3">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/55 mb-2">{t("signup.officialTitle")}</p>
                  <div className="flex gap-2">
                    <input
                      className={`${field} !py-2 font-mono tracking-[0.2em]`}
                      type="password"
                      inputMode="numeric"
                      value={officialCode}
                      onChange={(e) => setOfficialCode(e.target.value)}
                      placeholder={t("signup.officialCodePh")}
                      aria-label={t("signup.officialTitle")}
                    />
                    <Btn kind="navy" onClick={tryUnlock}>{t("act.confirm")}</Btn>
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40 mt-2 leading-relaxed">{t("signup.officialHint")}</p>
                </div>
              )}
            </>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40"><IcUser c="w-4 h-4" /></span>
              <select
                className={`${field} !bg-navy2/90 pl-9 pr-9 appearance-none cursor-pointer`}
                value={role}
                onChange={(e) => setRole(e.target.value as RoleId)}
                aria-label={t("signup.roleLbl")}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{t(`role.${r}`)}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-paper/40 pointer-events-none"><IcChevD c="w-3.5 h-3.5" /></span>
            </div>
          )}
          {empty && <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber2 mt-1.5">{t("signup.foundingNote")}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>{t("firstrun.name")}</label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("signup.namePh")} />
          </div>
          <div>
            <label className={label}>{t("signup.phone")}</label>
            <input className={field} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("signup.phonePh")} />
          </div>
        </div>
        <div>
          <label className={label}>{t("firstrun.email")}</label>
          <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("signup.emailPh")} />
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
            <select className={`${field} !bg-navy2/90 cursor-pointer`} value={qCustom ? "custom" : String(qIdx)} onChange={(e) => { if (e.target.value === "custom") setQCustom(true); else { setQCustom(false); setQIdx(Number(e.target.value)); } }}>
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
        {err && <p className="text-[12.5px] text-[#f0a48f] border-l-2 border-crimson pl-3">{err}</p>}
        <Btn type="submit" kind="green" disabled={!valid} className="w-full !py-3 !text-[13px]">
          <IcUser c="w-4 h-4" /> {t("signup.submit")}
        </Btn>
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/40 text-center leading-relaxed">{t("signup.3faNote")}</p>
      </form>
    </div>
  );
}
