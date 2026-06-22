-- Manual setup (run as MySQL root if you prefer SQL over npm run setup:db)
-- Replace passwords before running in production.

CREATE DATABASE IF NOT EXISTS atleast80
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- '%' = allow connections from any host
CREATE USER IF NOT EXISTS 'atleast80_user'@'%' IDENTIFIED BY 'Atleast80@2026';
GRANT ALL PRIVILEGES ON atleast80.* TO 'atleast80_user'@'%';

CREATE USER IF NOT EXISTS 'atleast80_user'@'localhost' IDENTIFIED BY 'Atleast80@2026';
GRANT ALL PRIVILEGES ON atleast80.* TO 'atleast80_user'@'localhost';

FLUSH PRIVILEGES;
