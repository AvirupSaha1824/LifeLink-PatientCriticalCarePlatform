export type CaregiverViewState = "loading" | "error" | "empty" | "ready";

export const CAREGIVER_EMPTY_COPY = "Invite a trusted caregiver to begin sharing practical care updates.";
export const CAREGIVER_ERROR_TITLE = "We could not load the caregiver network.";
export const CAREGIVER_RETRY_LABEL = "Try again";

export function getCaregiverViewState(input: { isLoading: boolean; hasError: boolean; caregiverCount: number }): CaregiverViewState {
  if (input.isLoading) return "loading";
  if (input.hasError) return "error";
  if (input.caregiverCount === 0) return "empty";
  return "ready";
}

export function retryCaregiverNetwork(refetchers: Array<() => unknown>): unknown[] {
  return refetchers.map(refetch => refetch());
}
