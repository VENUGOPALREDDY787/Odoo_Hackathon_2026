-- expand_audit_module
-- Adds: description, scopeCategoryId, scheduledStartDate, scheduledEndDate,
--        startDate (now nullable), endDate (now nullable), closedAt, cancelledAt,
--        cancelReason, status update, totalAssets, verifiedCount, missingCount, damagedCount
-- to AuditCycle.
-- Adds: assignedAt, assignedBy to AuditAuditor.
-- Adds: physicalLocation, conditionOnVerify, unique constraint and index to AuditItem.
-- Creates: AuditDiscrepancy and AuditEvidence tables.
-- Creates: auditScopeCategory relation on AssetCategory.

-- ────────────────────────────────────────────────
-- 1. ALTER audit_cycles
-- ────────────────────────────────────────────────
ALTER TABLE `audit_cycles`
  ADD COLUMN `description`           LONGTEXT                                    NULL AFTER `name`,
  ADD COLUMN `scope_category_id`     VARCHAR(191)                                NULL AFTER `scope_location`,
  ADD COLUMN `scheduled_start_date`  DATETIME(3)                                 NULL AFTER `scope_category_id`,
  ADD COLUMN `scheduled_end_date`    DATETIME(3)                                 NULL AFTER `scheduled_start_date`,
  ADD COLUMN `closed_at`             DATETIME(3)                                 NULL AFTER `end_date`,
  ADD COLUMN `cancelled_at`          DATETIME(3)                                 NULL AFTER `closed_at`,
  ADD COLUMN `cancel_reason`         LONGTEXT                                    NULL AFTER `cancelled_at`,
  ADD COLUMN `total_assets`          INT                    NOT NULL DEFAULT 0   AFTER `status`,
  ADD COLUMN `verified_count`        INT                    NOT NULL DEFAULT 0   AFTER `total_assets`,
  ADD COLUMN `missing_count`         INT                    NOT NULL DEFAULT 0   AFTER `verified_count`,
  ADD COLUMN `damaged_count`         INT                    NOT NULL DEFAULT 0   AFTER `missing_count`;

-- Make startDate and endDate nullable (they were NOT NULL before)
ALTER TABLE `audit_cycles`
  MODIFY COLUMN `start_date` DATETIME(3) NULL,
  MODIFY COLUMN `end_date`   DATETIME(3) NULL;

-- Add indexes on audit_cycles
CREATE INDEX `audit_cycles_organization_id_status_idx` ON `audit_cycles`(`organization_id`, `status`);
CREATE INDEX `audit_cycles_organization_id_scheduled_start_date_idx` ON `audit_cycles`(`organization_id`, `scheduled_start_date`);

-- Add FK for scope_category_id
ALTER TABLE `audit_cycles`
  ADD CONSTRAINT `audit_cycles_scope_category_id_fkey`
    FOREIGN KEY (`scope_category_id`) REFERENCES `asset_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ────────────────────────────────────────────────
-- 2. ALTER audit_auditors
-- ────────────────────────────────────────────────
ALTER TABLE `audit_auditors`
  ADD COLUMN `assigned_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `employee_id`,
  ADD COLUMN `assigned_by`  VARCHAR(191)                                        NULL AFTER `assigned_at`;

-- ────────────────────────────────────────────────
-- 3. ALTER audit_items
-- ────────────────────────────────────────────────
ALTER TABLE `audit_items`
  ADD COLUMN `physical_location`   VARCHAR(191) NULL AFTER `notes`,
  ADD COLUMN `condition_on_verify` VARCHAR(191) NULL AFTER `physical_location`;

-- Unique constraint: one item per asset per audit cycle
ALTER TABLE `audit_items`
  ADD CONSTRAINT `audit_items_audit_cycle_id_asset_id_key`
    UNIQUE (`audit_cycle_id`, `asset_id`);

-- Index on verification status for fast pending queries
CREATE INDEX `audit_items_audit_cycle_id_verification_status_idx`
  ON `audit_items`(`audit_cycle_id`, `verification_status`);

-- ────────────────────────────────────────────────
-- 4. CREATE audit_discrepancies
-- ────────────────────────────────────────────────
CREATE TABLE `audit_discrepancies` (
  `id`                VARCHAR(191)  NOT NULL,
  `audit_cycle_id`    VARCHAR(191)  NOT NULL,
  `asset_id`          VARCHAR(191)  NOT NULL,
  `discrepancy_type`  VARCHAR(191)  NOT NULL,
  `description`       LONGTEXT      NOT NULL,
  `severity`          VARCHAR(191)  NOT NULL DEFAULT 'Medium',
  `resolved_at`       DATETIME(3)   NULL,
  `resolution`        LONGTEXT      NULL,
  `created_at`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3)   NOT NULL,
  `created_by`        VARCHAR(191)  NULL,

  PRIMARY KEY (`id`),
  INDEX `audit_discrepancies_audit_cycle_id_discrepancy_type_idx`(`audit_cycle_id`, `discrepancy_type`),

  CONSTRAINT `audit_discrepancies_audit_cycle_id_fkey`
    FOREIGN KEY (`audit_cycle_id`) REFERENCES `audit_cycles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `audit_discrepancies_asset_id_fkey`
    FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 5. CREATE audit_evidence
-- ────────────────────────────────────────────────
CREATE TABLE `audit_evidence` (
  `id`            VARCHAR(191)  NOT NULL,
  `audit_item_id` VARCHAR(191)  NOT NULL,
  `file_url`      VARCHAR(191)  NOT NULL,
  `file_type`     VARCHAR(191)  NOT NULL,
  `caption`       LONGTEXT      NULL,
  `uploaded_by`   VARCHAR(191)  NOT NULL,
  `created_at`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `audit_evidence_audit_item_id_idx`(`audit_item_id`),

  CONSTRAINT `audit_evidence_audit_item_id_fkey`
    FOREIGN KEY (`audit_item_id`) REFERENCES `audit_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
