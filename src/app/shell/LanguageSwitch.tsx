import type { Lang } from "../../core/domain/model";
import { useT } from "../../ui/i18n/useT";
import styles from "./LanguageSwitch.module.css";

/** Native select — the best keyboard and screen-reader behaviour (D8). */
export function LanguageSwitch() {
  const { t, lang, setLang } = useT();
  return (
    <select
      className={styles.select}
      data-testid="language-switch"
      aria-label={t("shell.switchLanguage")}
      value={lang}
      onChange={(event) => setLang(event.target.value as Lang)}
    >
      <option value="en">{t("shell.langEnglish")}</option>
      <option value="es">{t("shell.langSpanish")}</option>
    </select>
  );
}
