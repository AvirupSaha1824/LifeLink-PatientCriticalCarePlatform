import { describe, expect, it, vi } from "vitest";
import {
  getReservationViewState,
  RESERVATION_EMPTY_COPY,
  RESERVATION_ERROR_TITLE,
  RESERVATION_RETRY_LABEL,
  retryReservationQuery,
} from "./reservationView";

describe("reservation dashboard view state", () => {
  it("prioritizes loading and then failure before evaluating reservation rows", () => {
    expect(getReservationViewState({ isLoading: true, hasError: true, itemCount: 0 })).toBe("loading");
    expect(getReservationViewState({ isLoading: false, hasError: true, itemCount: 3 })).toBe("error");
  });

  it("shows a reservation-specific empty state only when the query completes without rows", () => {
    expect(getReservationViewState({ isLoading: false, hasError: false, itemCount: 0 })).toBe("empty");
    expect(getReservationViewState({ isLoading: false, hasError: false, itemCount: 1 })).toBe("ready");
    expect(RESERVATION_EMPTY_COPY).toContain("selected status");
  });

  it("exposes a dedicated error title and retry affordance", () => {
    expect(RESERVATION_ERROR_TITLE).toBe("We could not load your blood reservations.");
    expect(RESERVATION_RETRY_LABEL).toBe("Try again");
  });

  it("invokes the reservation refetch controller when the retry affordance is used", async () => {
    const refetch = vi.fn().mockResolvedValue({ recovered: true, reservations: 1 });

    await expect(retryReservationQuery(refetch)).resolves.toEqual({ recovered: true, reservations: 1 });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
