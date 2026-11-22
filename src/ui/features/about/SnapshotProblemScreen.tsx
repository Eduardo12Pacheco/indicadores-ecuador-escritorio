/**
 * Full-screen recovery surface for an unreadable snapshot (S12/S14).
 *
 * Shown by the shell when `dataset_info` returns `SNAPSHOT_INVALID` or
 * `SNAPSHOT_NOT_FOUND`. The reset action restores the bundled snapshot and the
 * install notes link opens the documented recovery steps.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { resetSnapshot } from "../../../core/application/use-cases/snapshot";
import type { AppError } from "../../../core/domain/errors";
import { Button } from "../../design/primitives/Button/Button";
import { useToast } from "../../design/primitives/Toast/Toast";
import { useT } from "../../i18n/useT";
import { usePorts } from "../../ports-context";
import styles from "./SnapshotProblemScreen.module.css";

const INSTALL_URL =
  "https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/blob/main/docs/INSTALL.md";

/** Recovery screen for an invalid or missing active snapshot. */
export function SnapshotProblemScreen({ error }: { readonly error: AppError }) {
  const ports = usePorts();
  const queryClient = useQueryClient();
  const { t } = useT();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function restore(): Promise<void> {
    setBusy(true);
    setFailure(null);
    const result = await resetSnapshot(ports.dataset);
    setBusy(false);
    if (!result.ok) {
      setFailure(`${t("snapshotProblem.resetError")} ${result.error.message}`);
      return;
    }
    showToast({ title: t("snapshotProblem.resetDone"), variant: "success" });
    await queryClient.invalidateQueries({ queryKey: ["dataset"] });
  }

  return (
    <main className={styles.screen} aria-labelledby="snapshot-problem-title">
      <div className={styles.panel}>
        <h1 id="snapshot-problem-title">{t("snapshotProblem.title")}</h1>
        <p>{t("snapshotProblem.description")}</p>
        <details className={styles.details}>
          <summary>{t("common.details")}</summary>
          <pre>
            {error.code}: {error.message}
          </pre>
        </details>
        {failure === null ? null : (
          <p className={styles.error} role="alert">
            {failure}
          </p>
        )}
        <div className={styles.actions}>
          <Button variant="primary" loading={busy} onClick={() => void restore()}>
            {t("snapshotProblem.reset")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void ports.externalLinks.open(INSTALL_URL);
            }}
          >
            {t("snapshotProblem.install")}
          </Button>
        </div>
      </div>
    </main>
  );
}
