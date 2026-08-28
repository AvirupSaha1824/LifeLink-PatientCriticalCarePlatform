import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  bloodBanks,
  bloodGroupInventory,
  bloodReservations,
  caregiverProfiles,
  caregiverSharedUpdates,
  caregiverSuggestions,
  contactDetails,
  hospitals,
  hospitalTreatmentStatuses,
  InsertUser,
  locations,
  medicineAvailability,
  medicines,
  medicineSources,
  patientCaregiverLinks,
  patientProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export type MedicineSearchFilters = {
  query?: string;
  category?: string;
  location?: string;
  criticalOnly?: boolean;
  status?: "in_stock" | "low_stock" | "out_of_stock" | "on_request";
};

export type BloodSearchFilters = {
  query?: string;
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  component?: string;
  location?: string;
  status?: "available" | "limited" | "unavailable";
};

export type ReservationFilters = {
  patientId?: number;
  status?: "pending" | "accepted" | "fulfilled" | "cancelled";
};

export type TreatmentStatusFilters = {
  patientId?: number;
  treatmentType?: "transfusion" | "chemotherapy";
  status?: "scheduled" | "confirmed" | "in_progress" | "completed" | "delayed" | "cancelled";
};

export type CaregiverNetworkFilters = {
  patientId?: number;
  patientName?: string;
  linkStatus?: "invited" | "active" | "paused" | "revoked";
  suggestionStatus?: "new" | "acknowledged" | "completed" | "dismissed";
};

export type CaregiverInvitationInput = {
  patientName: string;
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
};

// Lazily create the Drizzle instance so local tooling can run without a database.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getDatabaseHealth() {
  const configured = Boolean(process.env.DATABASE_URL);
  if (!configured) return { configured: false, connected: false } as const;

  const db = await getDb();
  if (!db) return { configured: true, connected: false } as const;

  try {
    await db.execute(sql`SELECT 1`);
    return { configured: true, connected: true } as const;
  } catch (error) {
    console.warn("[Database] Health check failed:", error);
    return { configured: true, connected: false } as const;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };

  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function addMedicineFilters(filters: MedicineSearchFilters): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [];
  const query = filters.query?.trim();
  const location = filters.location?.trim();

  if (query) {
    const pattern = `%${query}%`;
    conditions.push(
      or(
        like(medicines.name, pattern),
        like(medicines.genericName, pattern),
        like(medicines.category, pattern),
        like(medicineSources.name, pattern),
      )!,
    );
  }

  if (filters.category) conditions.push(eq(medicines.category, filters.category));
  if (filters.criticalOnly) conditions.push(eq(medicines.isCritical, true));
  if (filters.status) conditions.push(eq(medicineAvailability.availabilityStatus, filters.status));

  if (location) {
    const pattern = `%${location}%`;
    conditions.push(or(like(locations.city, pattern), like(locations.district, pattern), like(locations.state, pattern))!);
  }

  return conditions;
}

export async function getMedicineAvailability(filters: MedicineSearchFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = addMedicineFilters(filters);
  return db
    .select({
      availabilityId: medicineAvailability.id,
      quantity: medicineAvailability.quantity,
      unit: medicineAvailability.unit,
      availabilityStatus: medicineAvailability.availabilityStatus,
      nextRestockAt: medicineAvailability.nextRestockAt,
      lastVerifiedAt: medicineAvailability.lastVerifiedAt,
      statusUpdatedAt: medicineAvailability.statusUpdatedAt,
      medicineId: medicines.id,
      medicineName: medicines.name,
      genericName: medicines.genericName,
      category: medicines.category,
      dosageForm: medicines.dosageForm,
      strength: medicines.strength,
      description: medicines.description,
      isCritical: medicines.isCritical,
      sourceId: medicineSources.id,
      sourceName: medicineSources.name,
      sourceType: medicineSources.sourceType,
      sourceStatus: medicineSources.operationalStatus,
      sourceVerified: medicineSources.isVerified,
      locationId: locations.id,
      addressLine1: locations.addressLine1,
      city: locations.city,
      district: locations.district,
      state: locations.state,
      latitude: locations.latitude,
      longitude: locations.longitude,
      contactPhone: contactDetails.value,
    })
    .from(medicineAvailability)
    .innerJoin(medicines, eq(medicineAvailability.medicineId, medicines.id))
    .innerJoin(medicineSources, eq(medicineAvailability.sourceId, medicineSources.id))
    .innerJoin(locations, eq(medicineSources.locationId, locations.id))
    .leftJoin(
      contactDetails,
      and(eq(contactDetails.medicineSourceId, medicineSources.id), eq(contactDetails.isPrimary, true)),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(medicineAvailability.lastVerifiedAt), medicines.name);
}

export async function getMedicineCategories() {
  const db = await getDb();
  if (!db) return [];

  return db.selectDistinct({ category: medicines.category }).from(medicines).orderBy(medicines.category);
}

function addBloodFilters(filters: BloodSearchFilters): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [];
  const query = filters.query?.trim();
  const location = filters.location?.trim();

  if (query) {
    const pattern = `%${query}%`;
    conditions.push(or(like(bloodBanks.name, pattern), like(bloodBanks.licenseNumber, pattern), like(locations.city, pattern))!);
  }
  if (filters.bloodGroup) conditions.push(eq(bloodGroupInventory.bloodGroup, filters.bloodGroup));
  if (filters.component) conditions.push(eq(bloodGroupInventory.component, filters.component));
  if (filters.status) conditions.push(eq(bloodGroupInventory.availabilityStatus, filters.status));

  if (location) {
    const pattern = `%${location}%`;
    conditions.push(or(like(locations.city, pattern), like(locations.district, pattern), like(locations.state, pattern))!);
  }

  return conditions;
}

export async function getBloodAvailability(filters: BloodSearchFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = addBloodFilters(filters);
  return db
    .select({
      inventoryId: bloodGroupInventory.id,
      bloodGroup: bloodGroupInventory.bloodGroup,
      component: bloodGroupInventory.component,
      availableUnits: bloodGroupInventory.availableUnits,
      reservedUnits: bloodGroupInventory.reservedUnits,
      availabilityStatus: bloodGroupInventory.availabilityStatus,
      lastUpdatedAt: bloodGroupInventory.lastUpdatedAt,
      statusUpdatedAt: bloodGroupInventory.statusUpdatedAt,
      bloodBankId: bloodBanks.id,
      bloodBankName: bloodBanks.name,
      licenseNumber: bloodBanks.licenseNumber,
      operationalStatus: bloodBanks.operationalStatus,
      isVerified: bloodBanks.isVerified,
      lastVerifiedAt: bloodBanks.lastVerifiedAt,
      locationId: locations.id,
      addressLine1: locations.addressLine1,
      city: locations.city,
      district: locations.district,
      state: locations.state,
      latitude: locations.latitude,
      longitude: locations.longitude,
      contactPhone: contactDetails.value,
    })
    .from(bloodGroupInventory)
    .innerJoin(bloodBanks, eq(bloodGroupInventory.bloodBankId, bloodBanks.id))
    .innerJoin(locations, eq(bloodBanks.locationId, locations.id))
    .leftJoin(
      contactDetails,
      and(eq(contactDetails.bloodBankId, bloodBanks.id), eq(contactDetails.isPrimary, true)),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bloodGroupInventory.lastUpdatedAt), bloodBanks.name);
}

export async function getBloodComponents() {
  const db = await getDb();
  if (!db) return [];

  return db
    .selectDistinct({ component: bloodGroupInventory.component })
    .from(bloodGroupInventory)
    .orderBy(bloodGroupInventory.component);
}

export async function getBloodMapMarkers(filters: BloodSearchFilters = {}) {
  const rows = await getBloodAvailability(filters);
  const markers = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    if (!markers.has(row.bloodBankId)) markers.set(row.bloodBankId, row);
  }
  return Array.from(markers.values());
}

export async function getBloodReservations(filters: ReservationFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL<unknown>[] = [];
  if (filters.patientId) conditions.push(eq(bloodReservations.patientId, filters.patientId));
  if (filters.status) conditions.push(eq(bloodReservations.status, filters.status));

  return db
    .select({
      reservationId: bloodReservations.id,
      referenceCode: bloodReservations.referenceCode,
      patientId: patientProfiles.id,
      patientName: patientProfiles.displayName,
      patientBloodGroup: bloodReservations.patientBloodGroup,
      requestedUnits: bloodReservations.requestedUnits,
      status: bloodReservations.status,
      requestedForAt: bloodReservations.requestedForAt,
      statusUpdatedAt: bloodReservations.statusUpdatedAt,
      acceptedAt: bloodReservations.acceptedAt,
      fulfilledAt: bloodReservations.fulfilledAt,
      bloodGroup: bloodGroupInventory.bloodGroup,
      component: bloodGroupInventory.component,
      bloodBankId: bloodBanks.id,
      bloodBankName: bloodBanks.name,
      bloodBankStatus: bloodBanks.operationalStatus,
      addressLine1: locations.addressLine1,
      city: locations.city,
      state: locations.state,
      contactPhone: contactDetails.value,
    })
    .from(bloodReservations)
    .innerJoin(patientProfiles, eq(bloodReservations.patientId, patientProfiles.id))
    .innerJoin(bloodGroupInventory, eq(bloodReservations.inventoryId, bloodGroupInventory.id))
    .innerJoin(bloodBanks, eq(bloodReservations.bloodBankId, bloodBanks.id))
    .innerJoin(locations, eq(bloodBanks.locationId, locations.id))
    .leftJoin(
      contactDetails,
      and(eq(contactDetails.bloodBankId, bloodBanks.id), eq(contactDetails.isPrimary, true)),
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bloodReservations.requestedForAt));
}

export async function getHospitalTreatmentStatuses(filters: TreatmentStatusFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL<unknown>[] = [];
  if (filters.patientId) conditions.push(eq(hospitalTreatmentStatuses.patientId, filters.patientId));
  if (filters.treatmentType) conditions.push(eq(hospitalTreatmentStatuses.treatmentType, filters.treatmentType));
  if (filters.status) conditions.push(eq(hospitalTreatmentStatuses.status, filters.status));

  return db
    .select({
      treatmentId: hospitalTreatmentStatuses.id,
      referenceCode: hospitalTreatmentStatuses.referenceCode,
      patientId: patientProfiles.id,
      patientName: patientProfiles.displayName,
      reservationId: hospitalTreatmentStatuses.reservationId,
      treatmentType: hospitalTreatmentStatuses.treatmentType,
      treatmentDetail: hospitalTreatmentStatuses.treatmentDetail,
      bloodGroup: hospitalTreatmentStatuses.bloodGroup,
      plannedUnits: hospitalTreatmentStatuses.plannedUnits,
      careCycle: hospitalTreatmentStatuses.careCycle,
      status: hospitalTreatmentStatuses.status,
      scheduledForAt: hospitalTreatmentStatuses.scheduledForAt,
      statusUpdatedAt: hospitalTreatmentStatuses.statusUpdatedAt,
      completedAt: hospitalTreatmentStatuses.completedAt,
      careNotes: hospitalTreatmentStatuses.careNotes,
      hospitalId: hospitals.id,
      hospitalName: hospitals.name,
      department: hospitals.department,
      hospitalPhone: hospitals.contactPhone,
      hospitalStatus: hospitals.operationalStatus,
      hospitalVerified: hospitals.isVerified,
      addressLine1: locations.addressLine1,
      city: locations.city,
      state: locations.state,
    })
    .from(hospitalTreatmentStatuses)
    .innerJoin(patientProfiles, eq(hospitalTreatmentStatuses.patientId, patientProfiles.id))
    .innerJoin(hospitals, eq(hospitalTreatmentStatuses.hospitalId, hospitals.id))
    .innerJoin(locations, eq(hospitals.locationId, locations.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(hospitalTreatmentStatuses.scheduledForAt);
}

export async function getCaregiverLinks(filters: CaregiverNetworkFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL<unknown>[] = [];
  if (filters.patientId) conditions.push(eq(patientCaregiverLinks.patientId, filters.patientId));
  if (filters.patientName?.trim()) conditions.push(eq(patientCaregiverLinks.patientName, filters.patientName.trim()));
  if (filters.linkStatus) conditions.push(eq(patientCaregiverLinks.linkStatus, filters.linkStatus));

  return db
    .select({
      linkId: patientCaregiverLinks.id,
      patientId: patientProfiles.id,
      patientName: patientProfiles.displayName,
      linkStatus: patientCaregiverLinks.linkStatus,
      sharingLevel: patientCaregiverLinks.sharingLevel,
      invitedAt: patientCaregiverLinks.invitedAt,
      acceptedAt: patientCaregiverLinks.acceptedAt,
      lastSharedAt: patientCaregiverLinks.lastSharedAt,
      caregiverId: caregiverProfiles.id,
      caregiverName: caregiverProfiles.fullName,
      relationship: caregiverProfiles.relationship,
      caregiverPhone: caregiverProfiles.phone,
      caregiverEmail: caregiverProfiles.email,
      availability: caregiverProfiles.availability,
      notificationPreference: caregiverProfiles.notificationPreference,
      isVerified: caregiverProfiles.isVerified,
      lastActiveAt: caregiverProfiles.lastActiveAt,
    })
    .from(patientCaregiverLinks)
    .innerJoin(patientProfiles, eq(patientCaregiverLinks.patientId, patientProfiles.id))
    .innerJoin(caregiverProfiles, eq(patientCaregiverLinks.caregiverId, caregiverProfiles.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(patientCaregiverLinks.lastSharedAt), caregiverProfiles.fullName);
}

export async function getCaregiverSharedUpdates(filters: CaregiverNetworkFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL<unknown>[] = [];
  if (filters.patientId) conditions.push(eq(patientCaregiverLinks.patientId, filters.patientId));
  if (filters.patientName?.trim()) conditions.push(eq(patientCaregiverLinks.patientName, filters.patientName.trim()));
  return db
    .select({
      updateId: caregiverSharedUpdates.id,
      reservationId: caregiverSharedUpdates.reservationId,
      reservationReferenceCode: bloodReservations.referenceCode,
      treatmentStatusId: caregiverSharedUpdates.treatmentStatusId,
      treatmentReferenceCode: hospitalTreatmentStatuses.referenceCode,
      medicineAvailabilityId: caregiverSharedUpdates.medicineAvailabilityId,
      updateType: caregiverSharedUpdates.updateType,
      priority: caregiverSharedUpdates.priority,
      title: caregiverSharedUpdates.title,
      detail: caregiverSharedUpdates.detail,
      sharedAt: caregiverSharedUpdates.sharedAt,
      readAt: caregiverSharedUpdates.readAt,
      caregiverName: caregiverProfiles.fullName,
      caregiverLinkId: patientCaregiverLinks.id,
      patientId: patientProfiles.id,
      patientName: patientProfiles.displayName,
    })
    .from(caregiverSharedUpdates)
    .innerJoin(patientCaregiverLinks, eq(caregiverSharedUpdates.caregiverLinkId, patientCaregiverLinks.id))
    .innerJoin(patientProfiles, eq(patientCaregiverLinks.patientId, patientProfiles.id))
    .innerJoin(caregiverProfiles, eq(patientCaregiverLinks.caregiverId, caregiverProfiles.id))
    .leftJoin(bloodReservations, eq(caregiverSharedUpdates.reservationId, bloodReservations.id))
    .leftJoin(hospitalTreatmentStatuses, eq(caregiverSharedUpdates.treatmentStatusId, hospitalTreatmentStatuses.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(caregiverSharedUpdates.sharedAt));
}

export async function getCaregiverSuggestions(filters: CaregiverNetworkFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL<unknown>[] = [];
  if (filters.patientId) conditions.push(eq(patientCaregiverLinks.patientId, filters.patientId));
  if (filters.patientName?.trim()) conditions.push(eq(patientCaregiverLinks.patientName, filters.patientName.trim()));
  if (filters.suggestionStatus) conditions.push(eq(caregiverSuggestions.suggestionStatus, filters.suggestionStatus));

  return db
    .select({
      suggestionId: caregiverSuggestions.id,
      reservationId: caregiverSuggestions.reservationId,
      reservationReferenceCode: bloodReservations.referenceCode,
      treatmentStatusId: caregiverSuggestions.treatmentStatusId,
      treatmentReferenceCode: hospitalTreatmentStatuses.referenceCode,
      category: caregiverSuggestions.category,
      title: caregiverSuggestions.title,
      detail: caregiverSuggestions.detail,
      suggestionStatus: caregiverSuggestions.suggestionStatus,
      suggestedAt: caregiverSuggestions.suggestedAt,
      statusUpdatedAt: caregiverSuggestions.statusUpdatedAt,
      caregiverName: caregiverProfiles.fullName,
      caregiverLinkId: patientCaregiverLinks.id,
      patientId: patientProfiles.id,
      patientName: patientProfiles.displayName,
    })
    .from(caregiverSuggestions)
    .innerJoin(patientCaregiverLinks, eq(caregiverSuggestions.caregiverLinkId, patientCaregiverLinks.id))
    .innerJoin(patientProfiles, eq(patientCaregiverLinks.patientId, patientProfiles.id))
    .innerJoin(caregiverProfiles, eq(patientCaregiverLinks.caregiverId, caregiverProfiles.id))
    .leftJoin(bloodReservations, eq(caregiverSuggestions.reservationId, bloodReservations.id))
    .leftJoin(hospitalTreatmentStatuses, eq(caregiverSuggestions.treatmentStatusId, hospitalTreatmentStatuses.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(caregiverSuggestions.suggestedAt));
}

export async function getCareJourney(patientId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const patient = await db.select().from(patientProfiles).where(eq(patientProfiles.id, patientId)).limit(1);
  if (!patient[0]) return undefined;

  const [reservations, treatments, caregiverLinks, sharedUpdates, suggestions] = await Promise.all([
    getBloodReservations({ patientId }),
    getHospitalTreatmentStatuses({ patientId }),
    getCaregiverLinks({ patientId }),
    getCaregiverSharedUpdates({ patientId }),
    getCaregiverSuggestions({ patientId }),
  ]);

  return { patient: patient[0], reservations, treatments, caregiverLinks, sharedUpdates, suggestions };
}

async function getPatientProfileByName(patientName: string) {
  const db = await getDb();
  if (!db) return undefined;

  const records = await db.select().from(patientProfiles).where(eq(patientProfiles.displayName, patientName)).limit(1);
  return records[0];
}

export async function inviteCaregiver(input: CaregiverInvitationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");

  const patient = await getPatientProfileByName(input.patientName);
  if (!patient) throw new Error("A patient profile is required before inviting a caregiver");

  let caregiver = await db.select().from(caregiverProfiles).where(eq(caregiverProfiles.phone, input.phone)).limit(1);
  if (!caregiver[0]) {
    await db.insert(caregiverProfiles).values({
      fullName: input.fullName,
      relationship: input.relationship,
      phone: input.phone,
      email: input.email ?? null,
      availability: "offline",
      notificationPreference: "all_updates",
      isVerified: false,
      lastActiveAt: new Date(),
    });
    caregiver = await db.select().from(caregiverProfiles).where(eq(caregiverProfiles.phone, input.phone)).limit(1);
  }

  const caregiverRecord = caregiver[0];
  if (!caregiverRecord) throw new Error("Unable to create caregiver profile");

  const links = await db
    .select()
    .from(patientCaregiverLinks)
    .where(and(eq(patientCaregiverLinks.patientId, patient.id), eq(patientCaregiverLinks.caregiverId, caregiverRecord.id)))
    .limit(1);
  if (links[0]) {
    return { linkId: links[0].id, caregiverId: caregiverRecord.id, created: false, linkStatus: links[0].linkStatus };
  }

  await db.insert(patientCaregiverLinks).values({
    patientId: patient.id,
    patientName: input.patientName,
    caregiverId: caregiverRecord.id,
    linkStatus: "invited",
    sharingLevel: "care_updates",
    invitedAt: new Date(),
  });
  const invitation = await db
    .select()
    .from(patientCaregiverLinks)
    .where(and(eq(patientCaregiverLinks.patientId, patient.id), eq(patientCaregiverLinks.caregiverId, caregiverRecord.id)))
    .limit(1);
  if (!invitation[0]) throw new Error("Unable to create caregiver invitation");

  return { linkId: invitation[0].id, caregiverId: caregiverRecord.id, created: true, linkStatus: invitation[0].linkStatus };
}
