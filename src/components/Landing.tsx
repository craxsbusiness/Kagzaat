import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefs, useT } from "../i18n";
import { useCountUp } from "../lib";
import { Btn } from "../ui";
import { IcChain, IcFile, IcFolder, IcGavel, IcScale, IcSend, IcShield, IcBox } from "../icons";
import AccessCluster from "./AccessCluster";

interface Props {
  stats: { courts: number; cases: number; ledger: number; users: number };
  onEnter: (mode: "signin" | "signup") => void;
}

/* scroll reveal wrapper */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* hand-drawn scales of justice */
function ScalesScene() {
  return (
    <div className="relative w-full max-w-[380px] mx-auto">
      {/* arch frame */}
      <div className="arch relative border-2 border-brass/60 bg-gradient-to-b from-navy/10 via-card to-card px-8 pt-14 pb-8 shadow-[0_30px_60px_-30px_var(--shadowc)]">
        <div className="arch-inner absolute inset-[7px] border border-brass/35 pointer-events-none" />
        {/* light beam */}
        <div
          className="beam-glow absolute left-1/2 -translate-x-1/2 top-2 w-[70%] h-56 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--brass) 26%, transparent), transparent 70%)" }}
        />
        {/* dust motes */}
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="mote absolute w-1 h-1 rounded-full bg-brass/70"
            style={{ left: `${22 + i * 18}%`, bottom: `${18 + (i % 2) * 10}%`, animationDelay: `${i * 1.7}s` }}
          />
        ))}

        <svg viewBox="0 0 220 240" className="relative w-full h-auto text-navy" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          {/* pillar + base */}
          <path d="M110 46 V196" />
          <path d="M70 196 H150 M82 206 H138" strokeWidth="4" />
          <circle cx="110" cy="38" r="7" className="text-brass" stroke="currentColor" />
          {/* beam (sways) */}
          <g className="scale-sway">
            <path d="M30 66 H190" strokeWidth="4" />
            {/* left pan */}
            <path d="M30 66 L14 110 M30 66 L46 110" strokeWidth="2.2" />
            <path d="M8 110 A22 10 0 0 0 52 110 Z" strokeWidth="2.6" className="text-brass" />
            {/* right pan */}
            <path d="M190 66 L174 110 M190 66 L206 110" strokeWidth="2.2" />
            <path d="M168 110 A22 10 0 0 0 212 110 Z" strokeWidth="2.6" className="text-brass" />
          </g>
          {/* gavel resting on base */}
          <g className="text-crimson">
            <rect x="128" y="168" width="46" height="13" rx="6.5" transform="rotate(-18 128 168)" fill="currentColor" stroke="none" />
            <path d="M150 178 L186 196" strokeWidth="5" />
            <path d="M118 194 H200" strokeWidth="3.4" />
          </g>
        </svg>

        <p className="relative text-center font-display italic text-[15px] text-ink2 mt-4 leading-snug">
          “Justice is not done until it is <span className="text-crimson font-semibold not-italic">on record</span>.”
        </p>
      </div>
      {/* plinth shadow */}
      <div className="mx-auto -mt-1 h-3 w-[70%] rounded-[50%] bg-ink/20 blur-md" aria-hidden="true" />
    </div>
  );
}

const SERVICES: { icon: ReactNode; tKey: string; dKey: string }[] = [
  { icon: <IcFolder c="w-5 h-5" />, tKey: "land.svc1t", dKey: "land.svc1d" },
  { icon: <IcFile c="w-5 h-5" />, tKey: "land.svc2t", dKey: "land.svc2d" },
  { icon: <IcBox c="w-5 h-5" />, tKey: "land.svc3t", dKey: "land.svc3d" },
  { icon: <IcGavel c="w-5 h-5 gavel-swing" />, tKey: "land.svc4t", dKey: "land.svc4d" },
  { icon: <IcSend c="w-5 h-5" />, tKey: "land.svc5t", dKey: "land.svc5d" },
  { icon: <IcChain c="w-5 h-5" />, tKey: "land.svc6t", dKey: "land.svc6d" },
];

export default function Landing({ stats, onEnter }: Props) {
  const t = useT();
  const { lang } = usePrefs();
  const courts = useCountUp(stats.courts);
  const cases = useCountUp(stats.cases);
  const ledger = useCountUp(stats.ledger);
  const users = useCountUp(stats.users);

  return (
    <div className="min-h-screen ambient-paper relative overflow-x-clip">
      <div className="watermark" aria-hidden="true" />

      {/* top bar */}
      <header className="relative z-20 flex items-center justify-between gap-3 px-5 lg:px-10 py-4">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-full bg-crimson text-paper flex items-center justify-center shadow-lg shadow-crimson/30">
            <IcScale c="w-5 h-5" />
          </span>
          <div>
            <p className="font-display font-bold tracking-[0.2em] text-[19px] leading-none text-ink">LEXVAULT</p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-ink3 mt-1">{t("app.tag")}</p>
          </div>
        </div>
        <AccessCluster />
      </header>

      {/* opening — the bench */}
      <section className="relative z-10 max-w-[1240px] mx-auto px-5 lg:px-10 pt-8 lg:pt-14 pb-16 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
        <div>
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-crimson">{t("land.kicker")}</p>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="font-display font-semibold text-[clamp(38px,5.4vw,64px)] leading-[1.02] tracking-tight text-ink mt-4">
              {t("land.h1")}
              <br />
              <em className="text-crimson">{t("land.h1b")}</em>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="text-[16.5px] text-ink2 leading-relaxed mt-6 max-w-xl">{t("land.sub")}</p>
          </Reveal>
          <Reveal delay={260}>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Btn kind="primary" className="!px-6 !py-3 !text-[14px] !rounded-full" onClick={() => onEnter("signin")}>
                <IcShield c="w-4 h-4" /> {t("land.enter")}
              </Btn>
              <Btn kind="ghost" className="!px-6 !py-3 !text-[14px] !rounded-full !border-navy/40" onClick={() => onEnter("signup")}>
                {t("land.create")}
              </Btn>
            </div>
          </Reveal>
          <Reveal delay={330}>
            <div className="mt-9 flex items-center gap-3">
              <span className="brass-rule w-14 shrink-0" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink3">{t("land.trust")}</p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={200}>
          <ScalesScene />
        </Reveal>
      </section>

      {/* live registry strip */}
      <section className="relative z-10 border-y border-line bg-card/70">
        <div className="max-w-[1240px] mx-auto px-5 lg:px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: t("land.stCourts"), val: courts },
            { label: t("land.stCases"), val: cases },
            { label: t("land.stLedger"), val: ledger },
            { label: t("land.stUsers"), val: users },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="flex items-baseline gap-3">
                <p className="font-display font-bold text-[40px] leading-none text-navy tabular-nums">{s.val}</p>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink2">{s.label}</p>
                  {i === 2 && (
                    <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-green mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green2 pulse-dot" /> {t("land.live")}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* services — docket ledger */}
      <section className="relative z-10 max-w-[1240px] mx-auto px-5 lg:px-10 py-16 lg:py-20">
        <Reveal>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-crimson">{t("land.servicesSub")}</p>
            <h2 className="font-display font-semibold text-[clamp(28px,3.6vw,42px)] leading-tight text-ink mt-3">{t("land.services")}</h2>
            <div className="brass-rule w-24 mt-5" />
          </div>
        </Reveal>
        <div className="mt-10 grid lg:grid-cols-2 gap-x-14">
          {SERVICES.map((s, i) => (
            <Reveal key={s.tKey} delay={(i % 2) * 90}>
              <div className="docket-row group relative flex items-start gap-5 border-b border-line/80 py-6 cursor-default">
                <span className="docket-tick absolute left-0 top-6 bottom-6 w-[3px] bg-brass rounded-full" />
                <p className="font-display italic font-semibold text-[34px] leading-none text-ink3/70 w-12 shrink-0 group-hover:text-crimson transition-colors">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <span className="mt-1 w-11 h-11 rounded-full border border-line bg-card text-navy flex items-center justify-center shrink-0 group-hover:border-brass group-hover:text-brass transition-colors">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-[20px] text-ink leading-tight">{t(s.tKey)}</h3>
                  <p className="text-[14.5px] text-ink2 leading-relaxed mt-1.5">{t(s.dKey)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how a case moves — case-file tabs */}
      <section className="relative z-10 ambient-navy text-paper py-16 lg:py-20">
        <div className="max-w-[1240px] mx-auto px-5 lg:px-10">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e5b768]">{t("land.how")}</p>
            <div className="brass-rule w-24 mt-5" />
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { t: "land.hw1t", d: "land.hw1d" },
              { t: "land.hw2t", d: "land.hw2d" },
              { t: "land.hw3t", d: "land.hw3d" },
              { t: "land.hw4t", d: "land.hw4d" },
            ].map((step, i) => (
              <Reveal key={step.t} delay={i * 110}>
                <div className="group relative h-full rounded-t-[14px] rounded-b-lg border border-navyline/60 bg-paper/[0.045] hover:bg-paper/[0.09] transition-colors px-5 pt-7 pb-6 overflow-hidden">
                  {/* manila tab */}
                  <span className="absolute -top-px left-5 w-16 h-3 rounded-b-lg bg-brass/80 group-hover:h-4 transition-all" aria-hidden="true" />
                  <p className="font-display italic font-semibold text-[30px] text-[#e5b768]/80 leading-none">{i + 1}</p>
                  <h3 className="font-display font-semibold text-[19px] mt-3">{t(step.t)}</h3>
                  <p className="text-[13.5px] text-paper/65 leading-relaxed mt-2">{t(step.d)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-line bg-card/60">
        <div className="max-w-[1240px] mx-auto px-5 lg:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-navy text-paper flex items-center justify-center">
              <IcScale c="w-4 h-4" />
            </span>
            <p className="text-[13px] text-ink2 max-w-xl leading-relaxed">{t("land.footer")}</p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold tracking-[0.2em] text-[15px] text-ink">LEXVAULT</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink3 mt-1">{t("land.demo")}</p>
          </div>
        </div>
      </footer>

      {/* language note for sr/seo */}
      <span className="sr-only">{lang === "hi" ? "लेक्सवॉल्ट — सुरक्षित न्यायिक दस्तावेज़ पोर्टल" : "LexVault — secure judicial document portal"}</span>
    </div>
  );
}
