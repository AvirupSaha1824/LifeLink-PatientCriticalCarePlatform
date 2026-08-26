CREATE TABLE `bloodBanks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`licenseNumber` varchar(100),
	`locationId` int NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`operationalStatus` enum('open','limited','closed') NOT NULL DEFAULT 'open',
	`lastVerifiedAt` timestamp NOT NULL DEFAULT (now()),
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bloodBanks_id` PRIMARY KEY(`id`),
	CONSTRAINT `blood_banks_name_location_unique` UNIQUE(`name`,`locationId`)
);
--> statement-breakpoint
CREATE TABLE `bloodGroupInventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bloodBankId` int NOT NULL,
	`bloodGroup` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
	`component` varchar(120) NOT NULL,
	`availableUnits` int NOT NULL,
	`reservedUnits` int NOT NULL DEFAULT 0,
	`availabilityStatus` enum('available','limited','unavailable') NOT NULL,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bloodGroupInventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `blood_inventory_unique` UNIQUE(`bloodBankId`,`bloodGroup`,`component`)
);
--> statement-breakpoint
CREATE TABLE `contactDetails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bloodBankId` int,
	`medicineSourceId` int,
	`contactType` enum('phone','email','website','emergency') NOT NULL,
	`label` varchar(100),
	`value` varchar(320) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contactDetails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(160) NOT NULL,
	`addressLine1` varchar(255) NOT NULL,
	`addressLine2` varchar(255),
	`city` varchar(120) NOT NULL,
	`district` varchar(120),
	`state` varchar(120) NOT NULL,
	`postalCode` varchar(20),
	`country` varchar(64) NOT NULL DEFAULT 'India',
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicineAvailability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medicineId` int NOT NULL,
	`sourceId` int NOT NULL,
	`quantity` int NOT NULL,
	`unit` varchar(48) NOT NULL DEFAULT 'units',
	`availabilityStatus` enum('in_stock','low_stock','out_of_stock','on_request') NOT NULL,
	`nextRestockAt` timestamp,
	`lastVerifiedAt` timestamp NOT NULL DEFAULT (now()),
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicineAvailability_id` PRIMARY KEY(`id`),
	CONSTRAINT `medicine_availability_unique` UNIQUE(`medicineId`,`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `medicineSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`sourceType` enum('retail_pharmacy','hospital_pharmacy','specialty_pharmacy') NOT NULL,
	`locationId` int NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`operationalStatus` enum('open','limited','closed') NOT NULL DEFAULT 'open',
	`lastVerifiedAt` timestamp NOT NULL DEFAULT (now()),
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicineSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`genericName` varchar(180),
	`category` varchar(100) NOT NULL,
	`dosageForm` varchar(100) NOT NULL,
	`strength` varchar(100) NOT NULL,
	`description` text,
	`isCritical` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicines_id` PRIMARY KEY(`id`),
	CONSTRAINT `medicines_identity_unique` UNIQUE(`name`,`dosageForm`,`strength`)
);
--> statement-breakpoint
ALTER TABLE `bloodBanks` ADD CONSTRAINT `bloodBanks_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bloodGroupInventory` ADD CONSTRAINT `bloodGroupInventory_bloodBankId_bloodBanks_id_fk` FOREIGN KEY (`bloodBankId`) REFERENCES `bloodBanks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactDetails` ADD CONSTRAINT `contactDetails_bloodBankId_bloodBanks_id_fk` FOREIGN KEY (`bloodBankId`) REFERENCES `bloodBanks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contactDetails` ADD CONSTRAINT `contactDetails_medicineSourceId_medicineSources_id_fk` FOREIGN KEY (`medicineSourceId`) REFERENCES `medicineSources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medicineAvailability` ADD CONSTRAINT `medicineAvailability_medicineId_medicines_id_fk` FOREIGN KEY (`medicineId`) REFERENCES `medicines`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medicineAvailability` ADD CONSTRAINT `medicineAvailability_sourceId_medicineSources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `medicineSources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medicineSources` ADD CONSTRAINT `medicineSources_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `blood_banks_location_idx` ON `bloodBanks` (`locationId`);--> statement-breakpoint
CREATE INDEX `blood_banks_status_idx` ON `bloodBanks` (`operationalStatus`);--> statement-breakpoint
CREATE INDEX `blood_inventory_group_component_idx` ON `bloodGroupInventory` (`bloodGroup`,`component`);--> statement-breakpoint
CREATE INDEX `blood_inventory_status_idx` ON `bloodGroupInventory` (`availabilityStatus`);--> statement-breakpoint
CREATE INDEX `contacts_blood_bank_idx` ON `contactDetails` (`bloodBankId`);--> statement-breakpoint
CREATE INDEX `contacts_medicine_source_idx` ON `contactDetails` (`medicineSourceId`);--> statement-breakpoint
CREATE INDEX `locations_city_idx` ON `locations` (`city`);--> statement-breakpoint
CREATE INDEX `locations_state_idx` ON `locations` (`state`);--> statement-breakpoint
CREATE INDEX `medicine_availability_medicine_idx` ON `medicineAvailability` (`medicineId`);--> statement-breakpoint
CREATE INDEX `medicine_availability_source_idx` ON `medicineAvailability` (`sourceId`);--> statement-breakpoint
CREATE INDEX `medicine_availability_status_idx` ON `medicineAvailability` (`availabilityStatus`);--> statement-breakpoint
CREATE INDEX `medicine_sources_location_idx` ON `medicineSources` (`locationId`);--> statement-breakpoint
CREATE INDEX `medicine_sources_status_idx` ON `medicineSources` (`operationalStatus`);--> statement-breakpoint
CREATE INDEX `medicines_category_idx` ON `medicines` (`category`);--> statement-breakpoint
CREATE INDEX `medicines_critical_idx` ON `medicines` (`isCritical`);