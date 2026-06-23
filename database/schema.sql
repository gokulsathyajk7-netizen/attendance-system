-- ============================================================
-- ATTENDANCE MANAGEMENT SYSTEM - Complete MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_db;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  head_id INT UNSIGNED NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dept_code (code),
  INDEX idx_dept_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- USERS (Auth + Role table)
-- ============================================================
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin','manager','employee') NOT NULL DEFAULT 'employee',
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  password_reset_token VARCHAR(255) NULL,
  password_reset_expires TIMESTAMP NULL,
  refresh_token TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE employees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  employee_code VARCHAR(30) UNIQUE NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  designation VARCHAR(100) NOT NULL,
  salary DECIMAL(12,2) DEFAULT 0.00,
  joining_date DATE NOT NULL,
  profile_image VARCHAR(255) NULL,
  manager_id INT UNSIGNED NULL,
  status ENUM('active','inactive','suspended') DEFAULT 'active',
  address TEXT NULL,
  emergency_contact VARCHAR(15) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_emp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_emp_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_emp_code (employee_code),
  INDEX idx_emp_dept (department_id),
  INDEX idx_emp_status (status),
  INDEX idx_emp_manager (manager_id)
) ENGINE=InnoDB;

-- Add dept head FK after employees table exists
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================
-- GEOFENCES (Office Locations)
-- ============================================================
CREATE TABLE geofences (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  radius_meters INT UNSIGNED NOT NULL DEFAULT 100,
  address TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_geo_creator FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_geo_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present','absent','half_day','leave','weekend','holiday') NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  break_duration_minutes INT UNSIGNED DEFAULT 0,
  total_working_minutes INT UNSIGNED DEFAULT 0,
  overtime_minutes INT UNSIGNED DEFAULT 0,
  is_late TINYINT(1) DEFAULT 0,
  late_by_minutes INT UNSIGNED DEFAULT 0,
  check_in_lat DECIMAL(10,8) NULL,
  check_in_lng DECIMAL(11,8) NULL,
  check_out_lat DECIMAL(10,8) NULL,
  check_out_lng DECIMAL(11,8) NULL,
  geofence_id INT UNSIGNED NULL,
  inside_geofence TINYINT(1) DEFAULT 1,
  notes TEXT NULL,
  approved_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_att_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_geo FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE SET NULL,
  CONSTRAINT fk_att_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_emp_date (employee_id, attendance_date),
  INDEX idx_att_date (attendance_date),
  INDEX idx_att_status (status),
  INDEX idx_att_emp (employee_id)
) ENGINE=InnoDB;

-- ============================================================
-- ATTENDANCE LOGS (Every individual action)
-- ============================================================
CREATE TABLE attendance_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attendance_id INT UNSIGNED NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  action ENUM('check_in','check_out','break_start','break_end') NOT NULL,
  action_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  accuracy FLOAT NULL,
  device_info VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  is_manual TINYINT(1) DEFAULT 0,
  manual_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_log_att FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
  CONSTRAINT fk_log_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_log_att (attendance_id),
  INDEX idx_log_emp (employee_id),
  INDEX idx_log_action (action),
  INDEX idx_log_time (action_time)
) ENGINE=InnoDB;

-- ============================================================
-- LOCATIONS (Live GPS Tracking)
-- ============================================================
CREATE TABLE locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  accuracy FLOAT NULL,
  speed FLOAT NULL,
  heading FLOAT NULL,
  altitude FLOAT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_loc_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_loc_emp (employee_id),
  INDEX idx_loc_time (recorded_at)
) ENGINE=InnoDB;

-- ============================================================
-- LEAVES
-- ============================================================
CREATE TABLE leave_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  max_days_per_year INT UNSIGNED DEFAULT 0,
  is_paid TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO leave_types (name, code, max_days_per_year, is_paid) VALUES
  ('Casual Leave', 'CL', 12, 1),
  ('Sick Leave', 'SL', 10, 1),
  ('Earned Leave', 'EL', 15, 1),
  ('Work From Home', 'WFH', 24, 1);

CREATE TABLE leaves (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  leave_type_id INT UNSIGNED NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days DECIMAL(4,1) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  review_comment TEXT NULL,
  attachment VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_lv_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_lv_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  CONSTRAINT fk_lv_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_lv_emp (employee_id),
  INDEX idx_lv_status (status),
  INDEX idx_lv_dates (from_date, to_date)
) ENGINE=InnoDB;

-- ============================================================
-- LEAVE BALANCES
-- ============================================================
CREATE TABLE leave_balances (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  leave_type_id INT UNSIGNED NOT NULL,
  year YEAR NOT NULL,
  allocated_days DECIMAL(5,1) DEFAULT 0,
  used_days DECIMAL(5,1) DEFAULT 0,
  pending_days DECIMAL(5,1) DEFAULT 0,
  remaining_days DECIMAL(5,1) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_lb_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_lb_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  UNIQUE KEY uq_emp_type_year (employee_id, leave_type_id, year),
  INDEX idx_lb_year (year)
) ENGINE=InnoDB;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error','leave','attendance','system') DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  action_url VARCHAR(255) NULL,
  meta_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_read (is_read),
  INDEX idx_notif_type (type)
) ENGINE=InnoDB;

-- ============================================================
-- HOLIDAYS
-- ============================================================
CREATE TABLE holidays (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  type ENUM('national','regional','optional') DEFAULT 'national',
  description TEXT NULL,
  year YEAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_holiday_date (date),
  INDEX idx_holiday_year (year)
) ENGINE=InnoDB;

-- ============================================================
-- REGISTRATION REQUESTS (Self-service request, admin approves)
-- ============================================================
CREATE TABLE registration_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NULL,
  email VARCHAR(191) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_regreq_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_regreq_status (status),
  INDEX idx_regreq_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- REPORTS (Saved/Scheduled)
-- ============================================================
CREATE TABLE reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('daily','weekly','monthly','employee','department','custom') NOT NULL,
  parameters JSON NULL,
  generated_by INT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NULL,
  format ENUM('pdf','excel','csv') DEFAULT 'pdf',
  status ENUM('pending','generating','completed','failed') DEFAULT 'pending',
  generated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_rpt_user FOREIGN KEY (generated_by) REFERENCES users(id),
  INDEX idx_rpt_type (type),
  INDEX idx_rpt_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- SEED: Default Super Admin
-- Password: Admin@123 (bcrypt hashed)
-- ============================================================
INSERT INTO users (email, password_hash, role) VALUES
  ('superadmin@company.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/gzBpJK2', 'super_admin');

INSERT INTO departments (name, code, description) VALUES
  ('Human Resources', 'HR', 'HR Department'),
  ('Engineering', 'ENG', 'Software Engineering'),
  ('Sales', 'SALES', 'Sales & Marketing'),
  ('Finance', 'FIN', 'Finance & Accounts');
