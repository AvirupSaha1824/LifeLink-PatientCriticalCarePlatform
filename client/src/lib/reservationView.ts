export type ReservationViewState = "loading" | "error" | "empty" | "ready";

export const RESERVATION_EMPTY_COPY = "No reservations match the selected status. Choose another status filter to review other blood-bank requests.";
export const RESERVATION_ERROR_TITLE = "We could not load your blood reservations.";
export const RESERVATION_RETRY_LABEL = "Try again";

export function getReservationViewState(input: { isLoading: boolean; hasError: boolean; itemCount: number }): ReservationViewState {
  if (input.isLoading) return "loading";
  if (input.hasError) return "error";
  if (input.itemCount === 0) return "empty";
  return "ready";
}

export function retryReservationQuery<T>(refetch: () => T): T {
  return refetch();
}
