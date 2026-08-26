import { describe, expect, it } from "vitest";
import {
  closeDemoSession,
  demoStepView,
  nextDemoState,
  previousDemoState,
  restartDemoSession,
  restartDemoState,
  startDemoSession,
  startDemoState,
} from "./demoFlow";

describe("interactive demo flow", () => {
  it("starts at the patient profile and maps steps to their intended workspaces", () => {
    expect(startDemoState()).toEqual({ step: 0, reservationStatus: "idle" });
    expect(demoStepView(0)).toBe("home");
    expect(demoStepView(2)).toBe("blood");
    expect(demoStepView(4)).toBe("demo-bank");
  });

  it("creates a pending reservation before the blood-bank review and accepts it on the next state", () => {
    const pending = nextDemoState({ step: 2, reservationStatus: "idle" });
    const accepted = nextDemoState({ step: 4, reservationStatus: "pending" });

    expect(pending).toEqual({ step: 3, reservationStatus: "pending" });
    expect(accepted).toEqual({ step: 5, reservationStatus: "accepted" });
  });

  it("supports backwards navigation and ends cleanly after the alert stage", () => {
    expect(previousDemoState({ step: 5, reservationStatus: "accepted" })).toEqual({ step: 4, reservationStatus: "pending" });
    expect(nextDemoState({ step: 6, reservationStatus: "accepted" })).toBeNull();
  });

  it("resets any completed scenario to the initial patient-profile state", () => {
    expect(restartDemoState()).toEqual({ step: 0, reservationStatus: "idle" });
  });

  it("models the exact start, restart, and close controls used by the demo UI", () => {
    expect(startDemoSession()).toEqual({ demo: { step: 0, reservationStatus: "idle" }, view: "home" });
    expect(restartDemoSession()).toEqual({ demo: { step: 0, reservationStatus: "idle" }, view: "home" });
    expect(closeDemoSession()).toEqual({ demo: null, view: "home" });
  });
});
