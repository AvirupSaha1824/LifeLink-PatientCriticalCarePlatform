import { describe, expect, it, vi } from "vitest";
import {
  getTreatmentViewState,
  TREATMENT_EMPTY_COPY,
  TREATMENT_ERROR_TITLE,
  TREATMENT_RETRY_LABEL,
  retryTreatmentQuery,
} from "./treatmentView";

describe("treatment-status dashboard view state", () => {
  it("prioritizes loading and error states before evaluating treatment rows", () => {
    expect(getTreatmentViewState({ isLoading: true, hasError: true, itemCount: 0 })).toBe("loading");
    expect(getTreatmentViewState({ isLoading: false, hasError: true, itemCount: 4 })).toBe("error");
  });

  it("distinguishes empty treatment filters from ready treatment results", () => {
    expect(getTreatmentViewState({ isLoading: false, hasError: false, itemCount: 0 })).toBe("empty");
    expect(getTreatmentViewState({ isLoading: false, hasError: false, itemCount: 1 })).toBe("ready");
    expect(TREATMENT_EMPTY_COPY).toContain("hospital status");
  });

  it("exposes tailored error and retry copy", () => {
    expect(TREATMENT_ERROR_TITLE).toBe("We could not load hospital treatment updates.");
    expect(TREATMENT_RETRY_LABEL).toBe("Try again");
  });

  it("calls the supplied treatment refetch function when retry is requested", async () => {
    const refetch = vi.fn().mockResolvedValue({ recovered: true, treatmentCount: 4 });

    await expect(retryTreatmentQuery(refetch)).resolves.toEqual({ recovered: true, treatmentCount: 4 });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
