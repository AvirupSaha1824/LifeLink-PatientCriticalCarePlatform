import { z } from "zod";
import {
  getBloodAvailability,
  getBloodComponents,
  getBloodMapMarkers,
  getMedicineAvailability,
  getMedicineCategories,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const medicineFilters = z.object({
  query: z.string().trim().max(120).optional(),
  category: z.string().trim().max(100).optional(),
  location: z.string().trim().max(120).optional(),
  criticalOnly: z.boolean().optional(),
  status: z.enum(["in_stock", "low_stock", "out_of_stock", "on_request"]).optional(),
});

const bloodFilters = z.object({
  query: z.string().trim().max(120).optional(),
  bloodGroup: z.enum(bloodGroups).optional(),
  component: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  status: z.enum(["available", "limited", "unavailable"]).optional(),
});

export const healthRouter = router({
  medicines: router({
    list: publicProcedure.input(medicineFilters).query(({ input }) => getMedicineAvailability(input)),
    categories: publicProcedure.query(() => getMedicineCategories()),
  }),
  bloodBanks: router({
    list: publicProcedure.input(bloodFilters).query(({ input }) => getBloodAvailability(input)),
    components: publicProcedure.query(() => getBloodComponents()),
    mapMarkers: publicProcedure.input(bloodFilters).query(({ input }) => getBloodMapMarkers(input)),
  }),
});
