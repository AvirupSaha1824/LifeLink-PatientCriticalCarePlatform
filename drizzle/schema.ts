import {
  boolean,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing the Manus OAuth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Reusable geographic address and coordinate records for blood banks and medicine sources.
 */
export const locations = mysqlTable(
  "locations",
  {
    id: int("id").autoincrement().primaryKey(),
    label: varchar("label", { length: 160 }).notNull(),
    addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
    addressLine2: varchar("addressLine2", { length: 255 }),
    city: varchar("city", { length: 120 }).notNull(),
    district: varchar("district", { length: 120 }),
    state: varchar("state", { length: 120 }).notNull(),
    postalCode: varchar("postalCode", { length: 20 }),
    country: varchar("country", { length: 64 }).default("India").notNull(),
    latitude: double("latitude").notNull(),
    longitude: double("longitude").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("locations_city_idx").on(table.city),
    index("locations_state_idx").on(table.state),
  ],
);

/**
 * Hospitals and pharmacies that can publish medicine availability.
 */
export const medicineSources = mysqlTable(
  "medicineSources",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    sourceType: mysqlEnum("sourceType", [
      "retail_pharmacy",
      "hospital_pharmacy",
      "specialty_pharmacy",
    ]).notNull(),
    locationId: int("locationId")
      .references(() => locations.id, { onDelete: "restrict" })
      .notNull(),
    isVerified: boolean("isVerified").default(false).notNull(),
    operationalStatus: mysqlEnum("operationalStatus", ["open", "limited", "closed"])
      .default("open")
      .notNull(),
    lastVerifiedAt: timestamp("lastVerifiedAt").defaultNow().notNull(),
    statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("medicine_sources_location_idx").on(table.locationId),
    index("medicine_sources_status_idx").on(table.operationalStatus),
  ],
);

/**
 * Canonical catalog of care medicines and critical infusions.
 */
export const medicines = mysqlTable(
  "medicines",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    genericName: varchar("genericName", { length: 180 }),
    category: varchar("category", { length: 100 }).notNull(),
    dosageForm: varchar("dosageForm", { length: 100 }).notNull(),
    strength: varchar("strength", { length: 100 }).notNull(),
    description: text("description"),
    isCritical: boolean("isCritical").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("medicines_identity_unique").on(table.name, table.dosageForm, table.strength),
    index("medicines_category_idx").on(table.category),
    index("medicines_critical_idx").on(table.isCritical),
  ],
);

/**
 * Source-specific medicine stock records, including operational availability and verification times.
 */
export const medicineAvailability = mysqlTable(
  "medicineAvailability",
  {
    id: int("id").autoincrement().primaryKey(),
    medicineId: int("medicineId")
      .references(() => medicines.id, { onDelete: "cascade" })
      .notNull(),
    sourceId: int("sourceId")
      .references(() => medicineSources.id, { onDelete: "cascade" })
      .notNull(),
    quantity: int("quantity").notNull(),
    unit: varchar("unit", { length: 48 }).default("units").notNull(),
    availabilityStatus: mysqlEnum("availabilityStatus", [
      "in_stock",
      "low_stock",
      "out_of_stock",
      "on_request",
    ]).notNull(),
    nextRestockAt: timestamp("nextRestockAt"),
    lastVerifiedAt: timestamp("lastVerifiedAt").defaultNow().notNull(),
    statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("medicine_availability_unique").on(table.medicineId, table.sourceId),
    index("medicine_availability_medicine_idx").on(table.medicineId),
    index("medicine_availability_source_idx").on(table.sourceId),
    index("medicine_availability_status_idx").on(table.availabilityStatus),
  ],
);

/**
 * Licensed blood-bank records that publish availability by blood group and component.
 */
export const bloodBanks = mysqlTable(
  "bloodBanks",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    licenseNumber: varchar("licenseNumber", { length: 100 }),
    locationId: int("locationId")
      .references(() => locations.id, { onDelete: "restrict" })
      .notNull(),
    isVerified: boolean("isVerified").default(false).notNull(),
    operationalStatus: mysqlEnum("operationalStatus", ["open", "limited", "closed"])
      .default("open")
      .notNull(),
    lastVerifiedAt: timestamp("lastVerifiedAt").defaultNow().notNull(),
    statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("blood_banks_name_location_unique").on(table.name, table.locationId),
    index("blood_banks_location_idx").on(table.locationId),
    index("blood_banks_status_idx").on(table.operationalStatus),
  ],
);

/**
 * Hospitals that publish verified transfusion and chemotherapy care updates.
 */
export const hospitals = mysqlTable(
  "hospitals",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    department: varchar("department", { length: 140 }).notNull(),
    locationId: int("locationId")
      .references(() => locations.id, { onDelete: "restrict" })
      .notNull(),
    contactPhone: varchar("contactPhone", { length: 48 }).notNull(),
    isVerified: boolean("isVerified").default(false).notNull(),
    operationalStatus: mysqlEnum("operationalStatus", ["open", "limited", "closed"]).default("open").notNull(),
    lastVerifiedAt: timestamp("lastVerifiedAt").defaultNow().notNull(),
    statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("hospitals_name_location_unique").on(table.name, table.locationId),
    index("hospitals_location_idx").on(table.locationId),
    index("hospitals_status_idx").on(table.operationalStatus),
  ],
);

/**
 * Current transfusion and chemotherapy milestones published by the care venue.
 * A row represents the latest status for one hospital treatment appointment.
 */
export const hospitalTreatmentStatuses = mysqlTable(
  "hospitalTreatmentStatuses",
  {
    id: int("id").autoincrement().primaryKey(),
    referenceCode: varchar("referenceCode", { length: 40 }).notNull(),
    patientName: varchar("patientName", { length: 160 }).notNull(),
    treatmentType: mysqlEnum("treatmentType", ["transfusion", "chemotherapy"]).notNull(),
    hospitalId: int("hospitalId")
      .references(() => hospitals.id, { onDelete: "restrict" })
      .notNull(),
    treatmentDetail: varchar("treatmentDetail", { length: 255 }).notNull(),
    bloodGroup: varchar("bloodGroup", { length: 8 }),
    plannedUnits: int("plannedUnits"),
    careCycle: varchar("careCycle", { length: 100 }),
    status: mysqlEnum("status", ["scheduled", "confirmed", "in_progress", "completed", "delayed", "cancelled"])
      .default("scheduled")
      .notNull(),
    scheduledForAt: timestamp("scheduledForAt").notNull(),
    statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    careNotes: text("careNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("hospital_treatment_reference_unique").on(table.referenceCode),
    index("hospital_treatment_status_idx").on(table.status),
    index("hospital_treatment_type_idx").on(table.treatmentType),
    index("hospital_treatment_hospital_idx").on(table.hospitalId),
    index("hospital_treatment_scheduled_idx").on(table.scheduledForAt),
  ],
);

/**
 * Current blood-component stock for a particular blood bank and blood group.
 */
export const bloodGroupInventory = mysqlTable(
  "bloodGroupInventory",
  {
    id: int("id").autoincrement().primaryKey(),
    bloodBankId: int("bloodBankId")
      .references(() => bloodBanks.id, { onDelete: "cascade" })
      .notNull(),
    bloodGroup: mysqlEnum("bloodGroup", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).notNull(),
    component: varchar("component", { length: 120 }).notNull(),
    availableUnits: int("availableUnits").notNull(),
    reservedUnits: int("reservedUnits").default(0).notNull(),
    availabilityStatus: mysqlEnum("availabilityStatus", ["available", "limited", "unavailable"])
      .notNull(),
    lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
    statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("blood_inventory_unique").on(table.bloodBankId, table.bloodGroup, table.component),
    index("blood_inventory_group_component_idx").on(table.bloodGroup, table.component),
    index("blood_inventory_status_idx").on(table.availabilityStatus),
  ],
);

/**
 * Patient blood-component reservations tracked from request through fulfilment.
 * The dashboard is deliberately driven by these persisted status records rather
 * than by the discovery inventory alone.
 */
export const bloodReservations = mysqlTable(
  "bloodReservations",
  {
    id: int("id").autoincrement().primaryKey(),
    referenceCode: varchar("referenceCode", { length: 40 }).notNull(),
    patientName: varchar("patientName", { length: 160 }).notNull(),
    patientBloodGroup: mysqlEnum("patientBloodGroup", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).notNull(),
    bloodBankId: int("bloodBankId")
      .references(() => bloodBanks.id, { onDelete: "restrict" })
      .notNull(),
    inventoryId: int("inventoryId")
      .references(() => bloodGroupInventory.id, { onDelete: "restrict" })
      .notNull(),
    requestedUnits: int("requestedUnits").notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "fulfilled", "cancelled"]).default("pending").notNull(),
    requestedForAt: timestamp("requestedForAt").notNull(),
    statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull(),
    acceptedAt: timestamp("acceptedAt"),
    fulfilledAt: timestamp("fulfilledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("blood_reservations_reference_unique").on(table.referenceCode),
    index("blood_reservations_status_idx").on(table.status),
    index("blood_reservations_blood_bank_idx").on(table.bloodBankId),
    index("blood_reservations_requested_for_idx").on(table.requestedForAt),
  ],
);

/**
 * Contact channels for blood banks and medicine sources.
 */
export const contactDetails = mysqlTable(
  "contactDetails",
  {
    id: int("id").autoincrement().primaryKey(),
    bloodBankId: int("bloodBankId").references(() => bloodBanks.id, { onDelete: "cascade" }),
    medicineSourceId: int("medicineSourceId").references(() => medicineSources.id, { onDelete: "cascade" }),
    contactType: mysqlEnum("contactType", ["phone", "email", "website", "emergency"]).notNull(),
    label: varchar("label", { length: 100 }),
    value: varchar("value", { length: 320 }).notNull(),
    isPrimary: boolean("isPrimary").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("contacts_blood_bank_idx").on(table.bloodBankId),
    index("contacts_medicine_source_idx").on(table.medicineSourceId),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type MedicineSource = typeof medicineSources.$inferSelect;
export type MedicineAvailability = typeof medicineAvailability.$inferSelect;
export type BloodBank = typeof bloodBanks.$inferSelect;
export type Hospital = typeof hospitals.$inferSelect;
export type HospitalTreatmentStatus = typeof hospitalTreatmentStatuses.$inferSelect;
export type BloodGroupInventory = typeof bloodGroupInventory.$inferSelect;
export type BloodReservation = typeof bloodReservations.$inferSelect;
export type ContactDetail = typeof contactDetails.$inferSelect;
