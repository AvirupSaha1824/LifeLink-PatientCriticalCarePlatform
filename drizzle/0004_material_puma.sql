CREATE TABLE `caregiverProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`relationship` varchar(100) NOT NULL,
	`phone` varchar(48) NOT NULL,
	`email` varchar(320),
	`availability` enum('available','busy','offline') NOT NULL DEFAULT 'available',
	`notificationPreference` enum('all_updates','critical_only','daily_summary') NOT NULL DEFAULT 'all_updates',
	`isVerified` boolean NOT NULL DEFAULT false,
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caregiverProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `caregiver_profiles_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `caregiverSharedUpdates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caregiverLinkId` int NOT NULL,
	`updateType` enum('reservation','treatment','medicine','appointment','general') NOT NULL,
	`priority` enum('routine','important','urgent') NOT NULL DEFAULT 'routine',
	`title` varchar(200) NOT NULL,
	`detail` text NOT NULL,
	`sharedAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caregiverSharedUpdates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caregiverSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caregiverLinkId` int NOT NULL,
	`category` enum('blood','treatment','medicine','appointment','wellbeing') NOT NULL,
	`title` varchar(200) NOT NULL,
	`detail` text NOT NULL,
	`suggestionStatus` enum('new','acknowledged','completed','dismissed') NOT NULL DEFAULT 'new',
	`suggestedAt` timestamp NOT NULL DEFAULT (now()),
	`statusUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caregiverSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patientCaregiverLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientName` varchar(160) NOT NULL,
	`caregiverId` int NOT NULL,
	`linkStatus` enum('invited','active','paused','revoked') NOT NULL DEFAULT 'invited',
	`sharingLevel` enum('care_updates','care_and_reservations','full_coordination') NOT NULL DEFAULT 'care_updates',
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`lastSharedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patientCaregiverLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `patient_caregiver_link_unique` UNIQUE(`patientName`,`caregiverId`)
);
--> statement-breakpoint
ALTER TABLE `caregiverSharedUpdates` ADD CONSTRAINT `cgs_update_link_fk` FOREIGN KEY (`caregiverLinkId`) REFERENCES `patientCaregiverLinks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `caregiverSuggestions` ADD CONSTRAINT `cgs_suggestion_link_fk` FOREIGN KEY (`caregiverLinkId`) REFERENCES `patientCaregiverLinks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patientCaregiverLinks` ADD CONSTRAINT `cgs_patient_link_fk` FOREIGN KEY (`caregiverId`) REFERENCES `caregiverProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `caregiver_profiles_availability_idx` ON `caregiverProfiles` (`availability`);--> statement-breakpoint
CREATE INDEX `caregiver_updates_link_idx` ON `caregiverSharedUpdates` (`caregiverLinkId`);--> statement-breakpoint
CREATE INDEX `caregiver_updates_priority_idx` ON `caregiverSharedUpdates` (`priority`);--> statement-breakpoint
CREATE INDEX `caregiver_updates_shared_at_idx` ON `caregiverSharedUpdates` (`sharedAt`);--> statement-breakpoint
CREATE INDEX `caregiver_suggestions_link_idx` ON `caregiverSuggestions` (`caregiverLinkId`);--> statement-breakpoint
CREATE INDEX `caregiver_suggestions_status_idx` ON `caregiverSuggestions` (`suggestionStatus`);--> statement-breakpoint
CREATE INDEX `caregiver_suggestions_category_idx` ON `caregiverSuggestions` (`category`);--> statement-breakpoint
CREATE INDEX `patient_caregiver_status_idx` ON `patientCaregiverLinks` (`linkStatus`);
