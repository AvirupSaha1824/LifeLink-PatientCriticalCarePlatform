import { describe, expect, it, vi } from "vitest";
import {
  CAREGIVER_EMPTY_COPY,
  CAREGIVER_ERROR_TITLE,
  CAREGIVER_RETRY_LABEL,
  getCaregiverViewState,
  retryCaregiverNetwork,
} from "./caregiverView";

describe("caregiver network dashboard view state", () => {
  it("prioritizes loading and error states before caregiver records", () => {
    expect(getCaregiverViewState({ isLoading: true, hasError: true, caregiverCount: 0 })).toBe("loading");
    expect(getCaregiverViewState({ isLoading: false, hasError: true, caregiverCount: 3 })).toBe("error");
  });

  it("distinguishes an empty caregiver network from ready caregiver data", () => {
    expect(getCaregiverViewState({ isLoading: false, hasError: false, caregiverCount: 0 })).toBe("empty");
    expect(getCaregiverViewState({ isLoading: false, hasError: false, caregiverCount: 1 })).toBe("ready");
    expect(CAREGIVER_EMPTY_COPY).toContain("Invite a trusted caregiver");
  });

  it("exposes caregiver-specific error and retry copy", () => {
    expect(CAREGIVER_ERROR_TITLE).toBe("We could not load the caregiver network.");
    expect(CAREGIVER_RETRY_LABEL).toBe("Try again");
  });

  it("retries all caregiver network queries", () => {
    const linkRefetch = vi.fn(() => "links");
    const updatesRefetch = vi.fn(() => "updates");
    const suggestionsRefetch = vi.fn(() => "suggestions");

    expect(retryCaregiverNetwork([linkRefetch, updatesRefetch, suggestionsRefetch])).toEqual(["links", "updates", "suggestions"]);
    expect(linkRefetch).toHaveBeenCalledTimes(1);
    expect(updatesRefetch).toHaveBeenCalledTimes(1);
    expect(suggestionsRefetch).toHaveBeenCalledTimes(1);
  });
});
