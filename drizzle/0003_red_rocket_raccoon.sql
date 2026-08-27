CREATE TABLE `hospitalTreatmentStatuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(40) NOT NULL,
	`patientName` varchar(160) NOT NULL,
	`treatmentType` enum('transfusion','chemotherapy') NOT NULL,
	`hospitalId` int NOT NULL,
	`treatmentDetail` varchar(255) NOT NULL,
	`bloodGroup` varchar(8),
	`plannedUnits` int,
	`careCycle` varchar(100),
	`status` enum('scheduled','confirmed','in_progress','completed','delayed','cancelled') NOT NULL DEFAULT 'scheduled',
	`scheduledForAt` timestamp NOT NULL,
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`careNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hospitalTreatmentStatuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `hospital_treatment_reference_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
CREATE TABLE `hospitals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`department` varchar(140) NOT NULL,
	`locationId` int NOT NULL,
	`contactPhone` varchar(48) NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`operationalStatus` enum('open','limited','closed') NOT NULL DEFAULT 'open',
	`lastVerifiedAt` timestamp NOT NULL DEFAULT (now()),
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hospitals_id` PRIMARY KEY(`id`),
	CONSTRAINT `hospitals_name_location_unique` UNIQUE(`name`,`locationId`)
);
--> statement-breakpoint
ALTER TABLE `hospitalTreatmentStatuses` ADD CONSTRAINT `hospitalTreatmentStatuses_hospitalId_hospitals_id_fk` FOREIGN KEY (`hospitalId`) REFERENCES `hospitals`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hospitals` ADD CONSTRAINT `hospitals_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `hospital_treatment_status_idx` ON `hospitalTreatmentStatuses` (`status`);--> statement-breakpoint
CREATE INDEX `hospital_treatment_type_idx` ON `hospitalTreatmentStatuses` (`treatmentType`);--> statement-breakpoint
CREATE INDEX `hospital_treatment_hospital_idx` ON `hospitalTreatmentStatuses` (`hospitalId`);--> statement-breakpoint
CREATE INDEX `hospital_treatment_scheduled_idx` ON `hospitalTreatmentStatuses` (`scheduledForAt`);--> statement-breakpoint
CREATE INDEX `hospitals_location_idx` ON `hospitals` (`locationId`);--> statement-breakpoint
CREATE INDEX `hospitals_status_idx` ON `hospitals` (`operationalStatus`);