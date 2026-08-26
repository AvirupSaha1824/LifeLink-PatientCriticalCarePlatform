export type DemoView = "home" | "blood" | "demo-bank";
export type DemoReservationStatus = "idle" | "pending" | "accepted";

export type DemoState = {
  step: number;
  reservationStatus: DemoReservationStatus;
};

export type DemoSession = {
  demo: DemoState | null;
  view: DemoView;
};

export const DEMO_STEPS = [
  {
    title: "Patient login & health profile",
    description: "Srijan’s profile confirms Thalassemia Major and blood group B+ before the urgent-care journey begins.",
  },
  {
    title: "Patient dashboard & next care task",
    description: "The high-priority transfusion card identifies two B+ PRBC units needed for the upcoming care date.",
  },
  {
    title: "Blood search & real-time availability",
    description: "LifeLink searches B+ PRBC availability in Kolkata and presents the live discovery results and map.",
  },
  {
    title: "Request blood reservation",
    description: "A representative reservation for two B+ PRBC units is created with a pending status for the selected blood bank.",
  },
  {
    title: "Blood-bank operations review",
    description: "The blood-bank officer receives Srijan’s inbound request and can review it before accepting the reservation.",
  },
  {
    title: "Blood bank accepts request",
    description: "Acceptance is recorded, the demo inventory allocation is updated, and the patient alert is prepared.",
  },
  {
    title: "Patient & caregiver alert",
    description: "LifeLink returns to the patient dashboard with a Blood Reservation Accepted alert for Srijan and caregiver Anita.",
  },
] as const;

export function startDemoState(): DemoState {
  return { step: 0, reservationStatus: "idle" };
}

export function restartDemoState(): DemoState {
  return startDemoState();
}

export function startDemoSession(): DemoSession {
  return { demo: startDemoState(), view: "home" };
}

export function restartDemoSession(): DemoSession {
  return { demo: restartDemoState(), view: "home" };
}

export function closeDemoSession(): DemoSession {
  return { demo: null, view: "home" };
}

export function demoStepView(step: number): DemoView {
  if (step === 2 || step === 3) return "blood";
  if (step === 4 || step === 5) return "demo-bank";
  return "home";
}

export function nextDemoState(state: DemoState): DemoState | null {
  if (state.step >= DEMO_STEPS.length - 1) return null;

  const step = state.step + 1;
  const reservationStatus: DemoReservationStatus = step >= 5 ? "accepted" : step >= 3 ? "pending" : "idle";
  return { step, reservationStatus };
}

export function previousDemoState(state: DemoState): DemoState {
  const step = Math.max(0, state.step - 1);
  const reservationStatus: DemoReservationStatus = step >= 5 ? "accepted" : step >= 3 ? "pending" : "idle";
  return { step, reservationStatus };
}
