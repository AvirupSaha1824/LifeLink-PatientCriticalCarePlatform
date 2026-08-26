CREATE TABLE `bloodReservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(40) NOT NULL,
	`patientName` varchar(160) NOT NULL,
	`patientBloodGroup` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
	`bloodBankId` int NOT NULL,
	`inventoryId` int NOT NULL,
	`requestedUnits` int NOT NULL,
	`status` enum('pending','accepted','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
	`requestedForAt` timestamp NOT NULL,
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`fulfilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bloodReservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `blood_reservations_reference_unique` UNIQUE(`referenceCode`)
);
--> statement-breakpoint
ALTER TABLE `bloodReservations` ADD CONSTRAINT `bloodReservations_bloodBankId_bloodBanks_id_fk` FOREIGN KEY (`bloodBankId`) REFERENCES `bloodBanks`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bloodReservations` ADD CONSTRAINT `bloodReservations_inventoryId_bloodGroupInventory_id_fk` FOREIGN KEY (`inventoryId`) REFERENCES `bloodGroupInventory`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `blood_reservations_status_idx` ON `bloodReservations` (`status`);--> statement-breakpoint
CREATE INDEX `blood_reservations_blood_bank_idx` ON `bloodReservations` (`bloodBankId`);--> statement-breakpoint
CREATE INDEX `blood_reservations_requested_for_idx` ON `bloodReservations` (`requestedForAt`);