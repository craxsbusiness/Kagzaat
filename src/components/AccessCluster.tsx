import { LANGUAGE_NAMES, usePrefs, useT } from "../i18n";
import { useToast } from "../ui";
import { IcChevD, IcLang, IcMoon, IcSun, IcTextSize } from "../icons";

/**
 * Shared accessibility cluster — language (8 Indian languages), text size, theme.
 * Used on the landing page and in the portal top bar.
 */
export default function AccessCluster({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const prefs = usePrefs();
  const toast = useToast();

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* language */}
      <div className="flex items-center gap-1.5 border border-line bg-card rounded-full pl-3 pr-1.5 py-1" role="group" aria-label={t("a11y.lang")}>
        <IcLang c="w-3.5 h-3.5 text-ink3" />
        {!compact && <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">{t("a11y.lang")}</span>}
        <div className="relative">
          <select
            value={prefs.lang}
            onChange={(e) => {
              prefs.setLang(e.target.value as typeof prefs.lang);
            }}
            className="appearance-none bg-transparent font-display font-semibold text-[13px] text-ink pl-1 pr-6 py-1.5 cursor-pointer focus:outline-none"
            aria-label={t("a11y.lang")}
          >
            {LANGUAGE_NAMES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none">
            <IcChevD c="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* text size */}
      <div className="flex items-center gap-0.5 border border-line bg-card rounded-full pl-3 pr-1.5 py-1" role="group" aria-label={t("a11y.size")}>
        <IcTextSize c="w-3.5 h-3.5 text-ink3" />
        <button
          onClick={prefs.zoomOut}
          disabled={prefs.zoomIdx === 0}
          className="font-display font-bold text-[14px] w-8 py-1.5 text-ink2 hover:text-ink hover:bg-paper2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={t("a11y.smaller")}
          aria-label={t("a11y.smaller")}
        >
          A−
        </button>
        <span className="font-mono text-[10px] text-ink3 w-9 text-center tabular-nums">{Math.round(prefs.zoom * 100)}%</span>
        <button
          onClick={prefs.zoomIn}
          disabled={prefs.zoomIdx >= 3}
          className="font-display font-bold text-[14px] w-8 py-1.5 text-ink2 hover:text-ink hover:bg-paper2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={t("a11y.larger")}
          aria-label={t("a11y.larger")}
        >
          A+
        </button>
      </div>

      {/* theme */}
      <button
        onClick={() => {
          const next = prefs.theme === "light" ? "dark" : "light";
          prefs.setTheme(next);
          toast("info", t("a11y.toastTheme"), next === "dark" ? t("a11y.dark") : t("a11y.light"));
        }}
        className="relative w-10 h-10 rounded-full border border-line bg-card text-ink2 hover:text-ink hover:border-navy transition-colors flex items-center justify-center overflow-hidden"
        title={prefs.theme === "light" ? t("a11y.dark") : t("a11y.light")}
        aria-label={prefs.theme === "light" ? t("a11y.dark") : t("a11y.light")}
      >
        <span key={prefs.theme} className="modal-in inline-flex">
          {prefs.theme === "light" ? <IcMoon c="w-4.5 h-4.5" /> : <IcSun c="w-4.5 h-4.5" />}
        </span>
      </button>
    </div>
  );
}
