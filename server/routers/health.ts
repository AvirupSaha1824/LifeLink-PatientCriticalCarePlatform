import { z } from "zod";
import {
  getBloodAvailability,
  getBloodComponents,
  getBloodMapMarkers,
  getBloodReservations,
  getCaregiverLinks,
  getCaregiverSharedUpdates,
  getCaregiverSuggestions,
  getHospitalTreatmentStatuses,
  inviteCaregiver,
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

const reservationFilters = z.object({
  status: z.enum(["pending", "accepted", "fulfilled", "cancelled"]).optional(),
});

const treatmentStatusFilters = z.object({
  treatmentType: z.enum(["transfusion", "chemotherapy"]).optional(),
  status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "delayed", "cancelled"]).optional(),
});

const caregiverNetworkFilters = z.object({
  patientName: z.string().trim().max(160).optional(),
  linkStatus: z.enum(["invited", "active", "paused", "revoked"]).optional(),
  suggestionStatus: z.enum(["new", "acknowledged", "completed", "dismissed"]).optional(),
});

const caregiverInvitationInput = z.object({
  patientName: z.string().trim().min(1).max(160),
  fullName: z.string().trim().min(2).max(160),
  relationship: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(48),
  email: z.string().trim().email().max(320).optional(),
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
  reservations: router({
    list: publicProcedure.input(reservationFilters).query(({ input }) => getBloodReservations(input)),
  }),
  treatments: router({
    list: publicProcedure.input(treatmentStatusFilters).query(({ input }) => getHospitalTreatmentStatuses(input)),
  }),
  caregivers: router({
    links: publicProcedure.input(caregiverNetworkFilters).query(({ input }) => getCaregiverLinks(input)),
    updates: publicProcedure.input(caregiverNetworkFilters).query(({ input }) => getCaregiverSharedUpdates(input)),
    suggestions: publicProcedure.input(caregiverNetworkFilters).query(({ input }) => getCaregiverSuggestions(input)),
    invite: publicProcedure.input(caregiverInvitationInput).mutation(({ input }) => inviteCaregiver(input)),
  }),
});
