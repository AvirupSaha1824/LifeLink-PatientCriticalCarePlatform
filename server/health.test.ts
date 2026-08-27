import { describe, expect, it } from "vitest";
import {
  getBloodAvailability,
  getBloodComponents,
  getBloodMapMarkers,
  getBloodReservations,
  getHospitalTreatmentStatuses,
  getMedicineAvailability,
  getMedicineCategories,
} from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("health public discovery API", () => {
  it("returns seeded B+ PRBC availability for Kolkata", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const results = await caller.health.bloodBanks.list({
      bloodGroup: "B+",
      component: "Packed Red Blood Cells (PRBC)",
      location: "Kolkata",
    });

    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.every(result => result.bloodGroup === "B+")).toBe(true);
    expect(results.every(result => result.component === "Packed Red Blood Cells (PRBC)")).toBe(true);
    expect(results.every(result => result.city === "Kolkata")).toBe(true);
  });

  it("searches medicine availability by a critical medicine name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const results = await caller.health.medicines.list({ query: "Albumin", criticalOnly: true });

    expect(results).toHaveLength(2);
    expect(results.every(result => result.medicineName === "Albumin")).toBe(true);
    expect(results.every(result => result.isCritical)).toBe(true);
    expect(results.map(result => result.availabilityStatus).sort()).toEqual(["in_stock", "low_stock"]);
  });

  it("returns unique map markers for matching blood-bank inventory", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const markers = await caller.health.bloodBanks.mapMarkers({
      bloodGroup: "B+",
      component: "Packed Red Blood Cells (PRBC)",
      location: "Kolkata",
    });

    expect(markers.length).toBeGreaterThanOrEqual(4);
    expect(new Set(markers.map(marker => marker.bloodBankId)).size).toBe(markers.length);
    expect(markers.every(marker => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))).toBe(true);
  });

  it("exposes medicine categories and blood components for frontend filters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const [categories, components] = await Promise.all([
      caller.health.medicines.categories(),
      caller.health.bloodBanks.components(),
    ]);

    expect(categories.map(category => category.category)).toContain("Critical infusion");
    expect(components.map(component => component.component)).toContain("Packed Red Blood Cells (PRBC)");
  });

  it("returns persisted blood-bank reservations and filters by lifecycle status", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const [allReservations, acceptedReservations] = await Promise.all([
      caller.health.reservations.list({}),
      caller.health.reservations.list({ status: "accepted" }),
    ]);

    expect(allReservations.length).toBeGreaterThanOrEqual(3);
    expect(allReservations.map(reservation => reservation.status)).toEqual(expect.arrayContaining(["pending", "accepted", "fulfilled"]));
    expect(acceptedReservations).toHaveLength(1);
    expect(acceptedReservations[0]).toMatchObject({
      referenceCode: "LL-RSV-2026-001",
      bloodBankName: expect.stringContaining("Kolkata Central Blood Bank"),
      status: "accepted",
    });
  });

  it("returns an empty result for a reservation status with no persisted records", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.health.reservations.list({ status: "cancelled" })).resolves.toEqual([]);
  });

  it("returns hospital treatment updates for transfusion and chemotherapy with filters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const [allTreatments, transfusions, chemotherapy] = await Promise.all([
      caller.health.treatments.list({}),
      caller.health.treatments.list({ treatmentType: "transfusion" }),
      caller.health.treatments.list({ treatmentType: "chemotherapy" }),
    ]);

    expect(allTreatments).toHaveLength(4);
    expect(transfusions).toHaveLength(2);
    expect(chemotherapy).toHaveLength(2);
    expect(transfusions.map(treatment => treatment.status)).toEqual(expect.arrayContaining(["confirmed", "completed"]));
    expect(chemotherapy.map(treatment => treatment.status)).toEqual(expect.arrayContaining(["scheduled", "delayed"]));
  });

  it("filters hospital treatment updates by completed and delayed lifecycle status", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const [completed, delayed] = await Promise.all([
      caller.health.treatments.list({ status: "completed" }),
      caller.health.treatments.list({ status: "delayed" }),
    ]);

    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({ referenceCode: "LL-TX-2026-003", treatmentType: "transfusion", status: "completed" });
    expect(delayed).toHaveLength(1);
    expect(delayed[0]).toMatchObject({ referenceCode: "LL-TX-2026-004", treatmentType: "chemotherapy", status: "delayed" });
  });
});

describe("health database query helpers", () => {
  it("filters medicine availability directly and exposes source context", async () => {
    const results = await getMedicineAvailability({ query: "Albumin", location: "Kolkata" });

    expect(results).toHaveLength(2);
    expect(results.every(result => result.medicineName === "Albumin")).toBe(true);
    expect(results.every(result => result.sourceName.startsWith("Demo —"))).toBe(true);
    expect(results.every(result => result.city === "Kolkata")).toBe(true);
  });

  it("filters blood availability and deduplicates map markers directly", async () => {
    const filters = { bloodGroup: "B+" as const, component: "Packed Red Blood Cells (PRBC)", location: "Kolkata" };
    const [inventory, markers] = await Promise.all([
      getBloodAvailability(filters),
      getBloodMapMarkers(filters),
    ]);

    expect(inventory.length).toBeGreaterThanOrEqual(4);
    expect(markers.length).toBeGreaterThanOrEqual(4);
    expect(new Set(markers.map(marker => marker.bloodBankId)).size).toBe(markers.length);
  });

  it("returns direct category and component options for frontend filters", async () => {
    const [categories, components] = await Promise.all([getMedicineCategories(), getBloodComponents()]);

    expect(categories.map(category => category.category)).toContain("Iron chelation");
    expect(components.map(component => component.component)).toContain("Fresh Frozen Plasma (FFP)");
  });

  it("returns reservation status history with blood-bank context directly", async () => {
    const reservations = await getBloodReservations();

    expect(reservations).toHaveLength(3);
    expect(reservations.every(reservation => reservation.patientName === "Srijan")).toBe(true);
    expect(reservations.every(reservation => reservation.component === "Packed Red Blood Cells (PRBC)")).toBe(true);
    expect(reservations.every(reservation => reservation.contactPhone)).toBe(true);
  });

  it("returns direct hospital treatment statuses with venue context", async () => {
    const treatments = await getHospitalTreatmentStatuses({ treatmentType: "transfusion" });

    expect(treatments).toHaveLength(2);
    expect(treatments.every(treatment => treatment.hospitalName.startsWith("Demo —"))).toBe(true);
    expect(treatments.every(treatment => treatment.department.length > 0 && treatment.hospitalPhone.length > 0)).toBe(true);
  });
});
