-- AlterTable
ALTER TABLE `maintenance_requests` ADD COLUMN `actual_cost` DECIMAL(15, 2) NULL,
    ADD COLUMN `cancel_reason` TEXT NULL,
    ADD COLUMN `closed_at` DATETIME(3) NULL,
    ADD COLUMN `estimated_completion_date` DATETIME(3) NULL,
    ADD COLUMN `estimated_cost` DECIMAL(15, 2) NULL,
    ADD COLUMN `rejection_reason` TEXT NULL,
    ADD COLUMN `started_at` DATETIME(3) NULL,
    ADD COLUMN `vendor` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `maintenance_requests_organization_id_status_idx` ON `maintenance_requests`(`organization_id`, `status`);

-- CreateIndex
CREATE INDEX `maintenance_requests_organization_id_asset_id_idx` ON `maintenance_requests`(`organization_id`, `asset_id`);

-- CreateIndex
CREATE INDEX `maintenance_requests_organization_id_priority_idx` ON `maintenance_requests`(`organization_id`, `priority`);
