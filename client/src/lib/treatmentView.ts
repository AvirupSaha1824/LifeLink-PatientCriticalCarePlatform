export type TreatmentViewState = "loading" | "error" | "empty" | "ready";

export const TREATMENT_EMPTY_COPY = "Choose another treatment type or hospital status to review available care updates.";
export const TREATMENT_ERROR_TITLE = "We could not load hospital treatment updates.";
export const TREATMENT_RETRY_LABEL = "Try again";

export function getTreatmentViewState(input: { isLoading: boolean; hasError: boolean; itemCount: number }): TreatmentViewState {
  if (input.isLoading) return "loading";
  if (input.hasError) return "error";
  if (input.itemCount === 0) return "empty";
  return "ready";
}

export function retryTreatmentQuery<T>(refetch: () => T): T {
  return refetch();
}
