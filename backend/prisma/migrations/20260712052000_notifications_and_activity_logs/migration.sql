-- 20260712052000_notifications_and_activity_logs
-- Evolving notifications and activity_logs tables

-- ────────────────────────────────────────────────
-- 1. ALTER notifications
-- ────────────────────────────────────────────────
ALTER TABLE `notifications`
  ADD COLUMN `status`     VARCHAR(191) NOT NULL DEFAULT 'Unread' AFTER `is_read`,
  ADD COLUMN `deleted_at` DATETIME(3)  NULL                   AFTER `created_at`;

CREATE INDEX `notifications_organization_id_recipient_id_status_idx`
  ON `notifications`(`organization_id`, `recipient_id`, `status`);

CREATE INDEX `notifications_organization_id_recipient_id_created_at_idx`
  ON `notifications`(`organization_id`, `recipient_id`, `created_at`);

-- ────────────────────────────────────────────────
-- 2. CREATE notification_preferences
-- ────────────────────────────────────────────────
CREATE TABLE `notification_preferences` (
  `id`              VARCHAR(191) NOT NULL,
  `organization_id` VARCHAR(191) NOT NULL,
  `employee_id`     VARCHAR(191) NOT NULL,
  `type`            VARCHAR(191) NOT NULL,
  `email_enabled`   TINYINT(1)   NOT NULL DEFAULT 1,
  `in_app_enabled`  TINYINT(1)   NOT NULL DEFAULT 1,
  `push_enabled`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `notification_preferences_employee_id_type_key`(`employee_id`, `type`),

  CONSTRAINT `notification_preferences_organization_id_fkey`
    FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notification_preferences_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 3. CREATE notification_templates
-- ────────────────────────────────────────────────
CREATE TABLE `notification_templates` (
  `id`              VARCHAR(191) NOT NULL,
  `organization_id` VARCHAR(191) NOT NULL,
  `type`            VARCHAR(191) NOT NULL,
  `title_template`  VARCHAR(191) NOT NULL,
  `body_template`   LONGTEXT     NOT NULL,
  `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `notification_templates_organization_id_type_key`(`organization_id`, `type`),

  CONSTRAINT `notification_templates_organization_id_fkey`
    FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 4. ALTER activity_logs
-- ────────────────────────────────────────────────
ALTER TABLE `activity_logs`
  ADD COLUMN `module`        VARCHAR(191) NULL AFTER `action`,
  ADD COLUMN `old_value`     JSON         NULL AFTER `entity_id`,
  ADD COLUMN `new_value`     JSON         NULL AFTER `old_value`,
  ADD COLUMN `department_id` VARCHAR(191) NULL AFTER `new_value`,
  ADD COLUMN `ip_address`    VARCHAR(191) NULL AFTER `department_id`,
  ADD COLUMN `browser`       VARCHAR(191) NULL AFTER `ip_address`,
  ADD COLUMN `device`        VARCHAR(191) NULL AFTER `browser`,
  ADD COLUMN `request_id`    VARCHAR(191) NULL AFTER `device`;

-- Drop the old `details` column as it is replaced by oldValue/newValue
ALTER TABLE `activity_logs` DROP COLUMN `details`;

CREATE INDEX `activity_logs_organization_id_user_id_action_idx`
  ON `activity_logs`(`organization_id`, `user_id`, `action`);

CREATE INDEX `activity_logs_organization_id_created_at_idx`
  ON `activity_logs`(`organization_id`, `created_at`);

ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_department_id_fkey`
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
