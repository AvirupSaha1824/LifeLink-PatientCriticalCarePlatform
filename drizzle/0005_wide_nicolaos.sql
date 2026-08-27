CREATE TABLE `patientProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`primaryHospitalId` int,
	`medicalRecordNumber` varchar(64) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`bloodGroup` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
	`careStatus` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patientProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `patient_profiles_user_unique` UNIQUE(`userId`),
	CONSTRAINT `patient_profiles_record_unique` UNIQUE(`medicalRecordNumber`)
);
--> statement-breakpoint
ALTER TABLE `bloodReservations` ADD `patientId` int;--> statement-breakpoint
ALTER TABLE `caregiverProfiles` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `caregiverSharedUpdates` ADD `reservationId` int;--> statement-breakpoint
ALTER TABLE `caregiverSharedUpdates` ADD `treatmentStatusId` int;--> statement-breakpoint
ALTER TABLE `caregiverSharedUpdates` ADD `medicineAvailabilityId` int;--> statement-breakpoint
ALTER TABLE `caregiverSuggestions` ADD `reservationId` int;--> statement-breakpoint
ALTER TABLE `caregiverSuggestions` ADD `treatmentStatusId` int;--> statement-breakpoint
ALTER TABLE `hospitalTreatmentStatuses` ADD `patientId` int;--> statement-breakpoint
ALTER TABLE `hospitalTreatmentStatuses` ADD `reservationId` int;--> statement-breakpoint
ALTER TABLE `patientCaregiverLinks` ADD `patientId` int;--> statement-breakpoint
ALTER TABLE `caregiverProfiles` ADD CONSTRAINT `caregiver_profiles_user_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `patientCaregiverLinks` ADD CONSTRAINT `patient_caregiver_profile_unique` UNIQUE(`patientId`,`caregiverId`);--> statement-breakpoint
INSERT INTO `users` (`openId`, `name`, `email`, `loginMethod`, `role`)
VALUES ('lifelink-demo-srijan-2026', 'Srijan (Representative Demo)', 'demo.srijan@lifelink.local', 'demo_seed', 'user')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `email` = VALUES(`email`), `loginMethod` = VALUES(`loginMethod`);--> statement-breakpoint
INSERT INTO `patientProfiles` (`userId`, `primaryHospitalId`, `medicalRecordNumber`, `displayName`, `bloodGroup`, `careStatus`)
SELECT `users`.`id`, (SELECT `id` FROM `hospitals` ORDER BY `id` LIMIT 1), 'DEMO-SRIJAN-001', 'Srijan', 'O+', 'active'
FROM `users`
WHERE `openId` = 'lifelink-demo-srijan-2026'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`), `bloodGroup` = VALUES(`bloodGroup`), `careStatus` = VALUES(`careStatus`);--> statement-breakpoint
UPDATE `bloodReservations` AS `reservation`
INNER JOIN `patientProfiles` AS `patient` ON `reservation`.`patientName` = `patient`.`displayName`
SET `reservation`.`patientId` = `patient`.`id`
WHERE `reservation`.`patientId` IS NULL;--> statement-breakpoint
UPDATE `hospitalTreatmentStatuses` AS `treatment`
INNER JOIN `patientProfiles` AS `patient` ON `treatment`.`patientName` = `patient`.`displayName`
SET `treatment`.`patientId` = `patient`.`id`
WHERE `treatment`.`patientId` IS NULL;--> statement-breakpoint
UPDATE `patientCaregiverLinks` AS `caregiverLink`
INNER JOIN `patientProfiles` AS `patient` ON `caregiverLink`.`patientName` = `patient`.`displayName`
SET `caregiverLink`.`patientId` = `patient`.`id`
WHERE `caregiverLink`.`patientId` IS NULL;--> statement-breakpoint
UPDATE `hospitalTreatmentStatuses` AS `treatment`
INNER JOIN `bloodReservations` AS `reservation` ON `reservation`.`referenceCode` = 'LL-RSV-2026-001'
SET `treatment`.`reservationId` = `reservation`.`id`
WHERE `treatment`.`referenceCode` = 'LL-TX-2026-001';--> statement-breakpoint
UPDATE `caregiverSharedUpdates` AS `sharedUpdate`
LEFT JOIN `bloodReservations` AS `reservation` ON `reservation`.`referenceCode` = 'LL-RSV-2026-001'
LEFT JOIN `hospitalTreatmentStatuses` AS `treatment` ON `treatment`.`referenceCode` = 'LL-TX-2026-001'
SET `sharedUpdate`.`reservationId` = `reservation`.`id`, `sharedUpdate`.`treatmentStatusId` = `treatment`.`id`
WHERE `sharedUpdate`.`title` = 'Blood reservation accepted';--> statement-breakpoint
UPDATE `caregiverSuggestions` AS `suggestion`
LEFT JOIN `bloodReservations` AS `reservation` ON `reservation`.`referenceCode` = 'LL-RSV-2026-001'
LEFT JOIN `hospitalTreatmentStatuses` AS `treatment` ON `treatment`.`referenceCode` = 'LL-TX-2026-001'
SET `suggestion`.`reservationId` = `reservation`.`id`, `suggestion`.`treatmentStatusId` = `treatment`.`id`
WHERE `suggestion`.`title` = 'Confirm collection requirements';--> statement-breakpoint
ALTER TABLE `bloodReservations` MODIFY `patientId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `hospitalTreatmentStatuses` MODIFY `patientId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `patientCaregiverLinks` MODIFY `patientId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `patientProfiles` ADD CONSTRAINT `pp_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patientProfiles` ADD CONSTRAINT `pp_hospital_fk` FOREIGN KEY (`primaryHospitalId`) REFERENCES `hospitals`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `patient_profiles_hospital_idx` ON `patientProfiles` (`primaryHospitalId`);--> statement-breakpoint
ALTER TABLE `bloodReservations` ADD CONSTRAINT `br_patient_fk` FOREIGN KEY (`patientId`) REFERENCES `patientProfiles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `caregiverProfiles` ADD CONSTRAINT `cp_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `caregiverSharedUpdates` ADD CONSTRAINT `csu_reservation_fk` FOREIGN KEY (`reservationId`) REFERENCES `bloodReservations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `caregiverSharedUpdates` ADD CONSTRAINT `csu_treatment_fk` FOREIGN KEY (`treatmentStatusId`) REFERENCES `hospitalTreatmentStatuses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `caregiverSharedUpdates` ADD CONSTRAINT `csu_medicine_fk` FOREIGN KEY (`medicineAvailabilityId`) REFERENCES `medicineAvailability`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `caregiverSuggestions` ADD CONSTRAINT `csg_reservation_fk` FOREIGN KEY (`reservationId`) REFERENCES `bloodReservations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `caregiverSuggestions` ADD CONSTRAINT `csg_treatment_fk` FOREIGN KEY (`treatmentStatusId`) REFERENCES `hospitalTreatmentStatuses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hospitalTreatmentStatuses` ADD CONSTRAINT `hts_patient_fk` FOREIGN KEY (`patientId`) REFERENCES `patientProfiles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hospitalTreatmentStatuses` ADD CONSTRAINT `hts_reservation_fk` FOREIGN KEY (`reservationId`) REFERENCES `bloodReservations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patientCaregiverLinks` ADD CONSTRAINT `pcl_patient_fk` FOREIGN KEY (`patientId`) REFERENCES `patientProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `blood_reservations_patient_idx` ON `bloodReservations` (`patientId`);--> statement-breakpoint
CREATE INDEX `caregiver_updates_reservation_idx` ON `caregiverSharedUpdates` (`reservationId`);--> statement-breakpoint
CREATE INDEX `caregiver_updates_treatment_idx` ON `caregiverSharedUpdates` (`treatmentStatusId`);--> statement-breakpoint
CREATE INDEX `caregiver_updates_medicine_idx` ON `caregiverSharedUpdates` (`medicineAvailabilityId`);--> statement-breakpoint
CREATE INDEX `caregiver_suggestions_reservation_idx` ON `caregiverSuggestions` (`reservationId`);--> statement-breakpoint
CREATE INDEX `caregiver_suggestions_treatment_idx` ON `caregiverSuggestions` (`treatmentStatusId`);--> statement-breakpoint
CREATE INDEX `hospital_treatment_patient_idx` ON `hospitalTreatmentStatuses` (`patientId`);--> statement-breakpoint
CREATE INDEX `hospital_treatment_reservation_idx` ON `hospitalTreatmentStatuses` (`reservationId`);--> statement-breakpoint
CREATE INDEX `patient_caregiver_patient_idx` ON `patientCaregiverLinks` (`patientId`);
