# LifeLink Blue Database Relationships

**Purpose.** This document describes the relational model used by LifeLink Blue's representative demonstration data. The model uses `patientProfiles` as the patient-care anchor: blood reservations, hospital treatment statuses, and caregiver consent links all reference the same patient profile. Human-readable patient names remain on selected legacy records for display and migration compatibility, while relational queries use `patientId`.

> **Clinical boundary.** Caregiver suggestions are practical care-coordination prompts only. They do not diagnose conditions, prescribe treatment, or replace decisions made by the treating clinical team.

## Entity-relationship diagram

```mermaid
erDiagram
    users {
        int id PK
        varchar openId UK
        text name
        varchar email
        enum role
    }

    locations {
        int id PK
        varchar label
        varchar city
        varchar state
        double latitude
        double longitude
    }

    medicineSources {
        int id PK
        int locationId FK
        varchar name
        enum sourceType
        enum operationalStatus
    }

    medicines {
        int id PK
        varchar name
        varchar genericName
        varchar category
        boolean isCritical
    }

    medicineAvailability {
        int id PK
        int medicineId FK
        int sourceId FK
        int quantity
        enum availabilityStatus
    }

    bloodBanks {
        int id PK
        int locationId FK
        varchar name
        varchar licenseNumber
        enum operationalStatus
    }

    bloodGroupInventory {
        int id PK
        int bloodBankId FK
        enum bloodGroup
        varchar component
        int availableUnits
        enum availabilityStatus
    }

    bloodReservations {
        int id PK
        varchar referenceCode UK
        int patientId FK
        varchar patientName
        int bloodBankId FK
        int inventoryId FK
        enum status
    }

    hospitals {
        int id PK
        int locationId FK
        varchar name
        varchar department
        varchar contactPhone
    }

    patientProfiles {
        int id PK
        int userId FK_UK
        int primaryHospitalId FK_NULLABLE
        varchar medicalRecordNumber UK
        varchar displayName
        enum bloodGroup
        enum careStatus
    }

    hospitalTreatmentStatuses {
        int id PK
        varchar referenceCode UK
        int patientId FK
        int hospitalId FK
        int reservationId FK_NULLABLE
        enum treatmentType
        enum status
    }

    caregiverProfiles {
        int id PK
        int userId FK_UK_NULLABLE
        varchar fullName
        varchar phone UK
        enum availability
    }

    patientCaregiverLinks {
        int id PK
        int patientId FK
        int caregiverId FK
        varchar patientName
        enum linkStatus
        enum sharingLevel
    }

    caregiverSharedUpdates {
        int id PK
        int caregiverLinkId FK
        int reservationId FK_NULLABLE
        int treatmentStatusId FK_NULLABLE
        int medicineAvailabilityId FK_NULLABLE
        enum updateType
        enum priority
    }

    caregiverSuggestions {
        int id PK
        int caregiverLinkId FK
        int reservationId FK_NULLABLE
        int treatmentStatusId FK_NULLABLE
        enum category
        enum suggestionStatus
    }

    contactDetails {
        int id PK
        int bloodBankId FK_NULLABLE
        int medicineSourceId FK_NULLABLE
        enum contactType
        varchar value
        boolean isPrimary
    }

    users ||--o| patientProfiles : "owns one patient profile"
    users o|--o| caregiverProfiles : "optionally authenticates caregiver"
    hospitals o|--o{ patientProfiles : "is primary care venue for"

    locations ||--o{ medicineSources : "locates"
    locations ||--o{ bloodBanks : "locates"
    locations ||--o{ hospitals : "locates"
    medicineSources ||--o{ medicineAvailability : "publishes"
    medicines ||--o{ medicineAvailability : "is stocked as"
    bloodBanks ||--o{ bloodGroupInventory : "holds"
    bloodBanks ||--o{ bloodReservations : "receives"
    bloodGroupInventory ||--o{ bloodReservations : "allocates"

    patientProfiles ||--o{ bloodReservations : "makes"
    patientProfiles ||--o{ hospitalTreatmentStatuses : "receives"
    bloodReservations o|--o{ hospitalTreatmentStatuses : "optionally supports"
    hospitals ||--o{ hospitalTreatmentStatuses : "publishes"

    patientProfiles ||--o{ patientCaregiverLinks : "consents to"
    caregiverProfiles ||--o{ patientCaregiverLinks : "participates in"
    patientCaregiverLinks ||--o{ caregiverSharedUpdates : "shares"
    patientCaregiverLinks ||--o{ caregiverSuggestions : "authors under"
    bloodReservations o|--o{ caregiverSharedUpdates : "optionally sources"
    hospitalTreatmentStatuses o|--o{ caregiverSharedUpdates : "optionally sources"
    medicineAvailability o|--o{ caregiverSharedUpdates : "optionally sources"
    bloodReservations o|--o{ caregiverSuggestions : "optionally contextualizes"
    hospitalTreatmentStatuses o|--o{ caregiverSuggestions : "optionally contextualizes"

    bloodBanks o|--o{ contactDetails : "has contact channel"
    medicineSources o|--o{ contactDetails : "has contact channel"
```

The diagram distinguishes **required foreign keys** from fields marked `FK_NULLABLE`. Required keys establish the patient-scoped core workflow. Nullable source references preserve a shared update or suggestion when a historical reservation, treatment status, or availability record is no longer present; the record remains tied to its caregiver consent link.

## Table responsibilities and connected keys

| Table | Primary responsibility | Outbound relationships | Inbound relationships |
| --- | --- | --- | --- |
| `users` | Manus OAuth identity and application role. | One optional patient profile; one optional caregiver profile. | `patientProfiles.userId`, `caregiverProfiles.userId`. |
| `patientProfiles` | Canonical patient care anchor. | Required user, optional primary hospital. | Reservations, treatment statuses, and caregiver consent links. |
| `locations` | Reusable address and map-coordinate record. | None. | Medicine sources, blood banks, and hospitals. |
| `medicineSources` | Pharmacy or hospital-pharmacy publisher. | Required location. | Medicine availability and source contact channels. |
| `medicines` | Canonical medicine catalog. | None. | Medicine availability records. |
| `medicineAvailability` | Source-specific medicine stock state. | Required medicine and source. | Optional caregiver shared-update provenance. |
| `bloodBanks` | Blood-bank directory and operating state. | Required location. | Inventory, reservations, and blood-bank contact channels. |
| `bloodGroupInventory` | Blood component availability at one blood bank. | Required blood bank. | Reservations allocated from that inventory item. |
| `bloodReservations` | Patient request and its blood-bank lifecycle. | Required patient, blood bank, and inventory. | Optional linked treatment, shared-update, and suggestion provenance. |
| `hospitals` | Care venue and department. | Required location. | Optional patient primary venue and treatment statuses. |
| `hospitalTreatmentStatuses` | Transfusion or chemotherapy appointment lifecycle. | Required patient and hospital; optional originating reservation. | Optional shared-update and suggestion provenance. |
| `caregiverProfiles` | Trusted care-contact identity and communication preference. | Optional application user account. | Patient-caregiver consent links. |
| `patientCaregiverLinks` | Patient consent, sharing level, and caregiver link status. | Required patient and caregiver. | Shared updates and suggestions. |
| `caregiverSharedUpdates` | Care activity disclosed under an active consent link. | Required caregiver link; optional reservation, treatment, and medicine source records. | None. |
| `caregiverSuggestions` | Non-diagnostic care-coordination prompt. | Required caregiver link; optional reservation and treatment context. | None. |
| `contactDetails` | Communication channel for a blood bank or medicine source. | One nullable source reference; application logic treats the intended source as exclusive. | None. |

## End-to-end representative workflow

The tested representative journey starts with the **Srijan** patient profile. `LL-RSV-2026-001` is an accepted blood reservation for that profile. `LL-TX-2026-001` is a transfusion treatment status for the same profile and holds the optional `reservationId` link to the accepted reservation.

The **Blood reservation accepted** caregiver shared update is attached to Srijan's caregiver consent link and carries both the reservation and treatment-status source references. The **Confirm collection requirements** suggestion is attached to the same patient-caregiver link and carries the same two source references. This permits a query to trace the workflow as follows.

| Sequence | Connected record | Relation that proves the connection |
| --- | --- | --- |
| 1 | Srijan patient profile | `patientProfiles.id` is the canonical patient key. |
| 2 | `LL-RSV-2026-001` reservation | `bloodReservations.patientId → patientProfiles.id`. |
| 3 | `LL-TX-2026-001` treatment status | Same `patientId`; `hospitalTreatmentStatuses.reservationId → bloodReservations.id`. |
| 4 | Blood reservation accepted update | `caregiverSharedUpdates.caregiverLinkId` belongs to Srijan; optional reservation and treatment keys identify the source records. |
| 5 | Confirm collection requirements suggestion | Same caregiver link and optional reservation/treatment keys provide direct traceability. |

## Integrity and retention decisions

| Design decision | Rationale |
| --- | --- |
| Core patient keys are non-null. | A reservation, treatment status, and caregiver consent link cannot exist outside a canonical patient profile. |
| Source provenance keys are nullable with `ON DELETE SET NULL`. | A historical coordination record is retained if a source reservation, treatment status, or availability record is removed; its consent context remains intact. |
| Caregiver profile user linkage is optional. | A trusted caregiver may be invited before creating or linking a platform account. |
| User-to-patient linkage is unique. | One authenticated user maps to at most one patient profile in the current demonstration model. |
| Legacy `patientName` remains. | It preserves existing display behavior and supports the safe migration from named records; access and relational scope should use `patientId`. |
| Contact-source exclusivity is application-enforced. | `contactDetails` supports either a blood-bank or medicine-source contact; a database-level XOR check is a future hardening step if the database platform policy permits it. |

The public procedures are intentionally retained for unauthenticated representative demos. Before handling real care data, patient-scoped authorization must verify that the signed-in user owns the selected patient profile and that caregiver access respects the relevant `patientCaregiverLinks` consent status and sharing level.
