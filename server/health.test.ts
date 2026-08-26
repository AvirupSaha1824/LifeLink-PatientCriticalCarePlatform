import { describe, expect, it } from "vitest";
import {
  getBloodAvailability,
  getBloodComponents,
  getBloodMapMarkers,
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
});
