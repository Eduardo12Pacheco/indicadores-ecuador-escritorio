import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { appError } from "../../../core/domain/errors";
import type { DatasetInfo } from "../../../core/domain/model";
import { err, ok, type Result } from "../../../core/domain/result";
import { makeDatasetInfo } from "../../../test/factories";
import { createFakePorts } from "../../../test/fake-ports";
import { renderWithProviders } from "../../../test/render";
import { SnapshotProblemScreen } from "./SnapshotProblemScreen";

function setup(resetResult: Result<DatasetInfo> = ok(makeDatasetInfo())) {
  const resetSnapshot = vi.fn(async () => resetResult);
  const externalOpen = vi.fn(async () => ok(undefined));
  const ports = createFakePorts({
    dataset: {
      getInfo: async () => err(appError("SNAPSHOT_INVALID", "bad file")),
      getCatalog: async () => ok({ topics: [], geographies: [], indicators: [] }),
      getObservations: async () => ok([]),
      openSnapshot: async () => ok(makeDatasetInfo()),
      resetSnapshot,
    },
    externalLinks: { open: externalOpen },
  });
  renderWithProviders(<SnapshotProblemScreen error={appError("SNAPSHOT_INVALID", "bad file")} />, {
    ports,
  });
  return { resetSnapshot, externalOpen };
}

describe("SnapshotProblemScreen", () => {
  it("explains the failure with technical details", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Dataset problem" })).toBeInTheDocument();
    expect(screen.getByText("SNAPSHOT_INVALID: bad file")).toBeInTheDocument();
  });

  it("resets to the bundled snapshot", async () => {
    const { resetSnapshot } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Reset to bundled snapshot" }));
    expect(resetSnapshot).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Bundled snapshot restored.")).toBeInTheDocument();
  });

  it("keeps the failure visible when the reset also fails", async () => {
    setup(err(appError("SNAPSHOT_NOT_FOUND", "missing bundled file")));
    await userEvent.click(screen.getByRole("button", { name: "Reset to bundled snapshot" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The bundled snapshot could not be restored. missing bundled file",
    );
  });

  it("opens the installation notes", async () => {
    const { externalOpen } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Read the installation notes" }));
    expect(externalOpen).toHaveBeenCalledWith(
      "https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio/blob/main/docs/INSTALL.md",
    );
  });
});
