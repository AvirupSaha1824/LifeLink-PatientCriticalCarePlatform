import { describe, expect, it } from "vitest";
import { describeCaregiverNetwork, formatDashboardNow, greetingForHour, indiaLocalHour, selectCurrentCareTask } from "./dashboardTimeline";

describe("dashboard timeline helpers", () => {
  it("formats a supplied local clock reading into a date and time for the dashboard", () => {
    const formatted = formatDashboardNow(new Date("2026-08-27T12:34:56+05:30"));

    expect(formatted.date).toContain("2026");
    expect(formatted.date).toContain("August");
    expect(formatted.time).toMatch(/12:34:56/);
    expect(indiaLocalHour(new Date("2026-08-27T12:34:56+05:30"))).toBe(12);
  });

  it("selects an active or confirmed task before lower-priority historical statuses", () => {
    const task = selectCurrentCareTask([
      { referenceCode: "LL-TX-003", treatmentType: "transfusion", treatmentDetail: "Completed transfusion", status: "completed", scheduledForAt: "2026-08-15T09:00:00Z" },
      { referenceCode: "LL-TX-002", treatmentType: "chemotherapy", treatmentDetail: "Scheduled chemotherapy", status: "scheduled", scheduledForAt: "2026-09-12T11:30:00Z" },
      { referenceCode: "LL-TX-001", treatmentType: "transfusion", treatmentDetail: "Confirmed transfusion", status: "confirmed", scheduledForAt: "2026-09-05T09:00:00Z" },
    ]);

    expect(task).toMatchObject({ referenceCode: "LL-TX-001", status: "confirmed" });
  });

  it("returns context-aware greetings and caregiver status counts", () => {
    expect(greetingForHour(8)).toBe("Good morning");
    expect(greetingForHour(14)).toBe("Good afternoon");
    expect(greetingForHour(19)).toBe("Good evening");
    expect(describeCaregiverNetwork(["active", "active", "invited", "revoked"])).toEqual({ active: 2, invited: 1, label: "2 active · 1 invited" });
  });
});
