import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function connectDB() {
  try {
    const connection = await pool.getConnection()
    await connection.ping()

    // Auto-migrate users table indexes to allow same email/phone across different roles (customer, kitchen, rider)
    try {
      try { await connection.query("ALTER TABLE users DROP INDEX email") } catch (_) {}
      try { await connection.query("ALTER TABLE users DROP INDEX phone") } catch (_) {}
      try { await connection.query("ALTER TABLE users DROP INDEX uq_users_email") } catch (_) {}
      try { await connection.query("ALTER TABLE users DROP INDEX uq_users_phone") } catch (_) {}
      
      try {
        await connection.query("ALTER TABLE users ADD UNIQUE KEY uq_users_email_role (email, role)")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE users ADD UNIQUE KEY uq_users_phone_role (phone, role)")
      } catch (_) {}

      console.log("✅ Auto-migrated users table indexes for per-role unique email and phone")
    } catch (e) {
      // Ignored if indexes already converted
    }

    // Auto-migrate bulk_order_enquiries status enum to add 'completed'
    try {
      await connection.query(`
        ALTER TABLE bulk_order_enquiries
        MODIFY COLUMN status ENUM('pending', 'quoted', 'accepted', 'rejected', 'completed') NOT NULL DEFAULT 'pending'
      `)
      console.log("✅ Auto-migrated bulk_order_enquiries.status enum (added 'completed')")
    } catch (e) {
      // Ignored if table doesn't exist yet or already altered
    }

    // Auto-migrate alerts target_role enum to add 'admin' and 'rider'
    try {
      await connection.query(`
        ALTER TABLE alerts
        MODIFY COLUMN target_role ENUM('kitchen', 'customer', 'admin', 'rider') NOT NULL
      `)
      console.log("✅ Auto-migrated alerts.target_role enum (added 'admin', 'rider')")
    } catch (e) {
      // Ignored if table doesn't exist yet or already altered
    }

    // Auto-migrate to add people_count column to bulk_order_enquiries
    try {
      await connection.query("ALTER TABLE bulk_order_enquiries ADD COLUMN people_count INT DEFAULT 1")
      console.log("✅ Auto-migrated bulk_order_enquiries (added people_count)")
    } catch (e) {
      // Ignored if column already exists
    }

    // Auto-migrate to add is_rescue and original_order_id columns to orders table
    try {
      await connection.query("ALTER TABLE orders ADD COLUMN is_rescue TINYINT(1) DEFAULT 0")
      console.log("✅ Auto-migrated orders (added is_rescue)")
    } catch (e) {
      // Ignored if column already exists
    }

    try {
      await connection.query("ALTER TABLE orders ADD COLUMN original_order_id INT NULL DEFAULT NULL")
      console.log("✅ Auto-migrated orders (added original_order_id)")
    } catch (e) {
      // Ignored if column already exists
    }

    try {
      await connection.query("ALTER TABLE orders ADD COLUMN doorstep_payment_method VARCHAR(30) NULL DEFAULT 'cash'")
    } catch (e) {}

    try {
      await connection.query("ALTER TABLE orders ADD COLUMN advance_amount DECIMAL(10,2) DEFAULT 30.00")
    } catch (e) {}

    try {
      await connection.query("ALTER TABLE orders ADD COLUMN remaining_amount DECIMAL(10,2) DEFAULT 0.00")
    } catch (e) {}

    try {
      await connection.query("ALTER TABLE orders ADD COLUMN refund_status VARCHAR(30) DEFAULT 'none'")
    } catch (e) {}

    try {
      await connection.query("ALTER TABLE orders ADD COLUMN payment_ref VARCHAR(255) DEFAULT NULL")
    } catch (e) {}

    try {
      await connection.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT NULL")
    } catch (e) {}

    try {
      await connection.query("ALTER TABLE orders ADD COLUMN cancellation_otp VARCHAR(10) DEFAULT NULL")
    } catch (e) {}

    // Auto-migrate menu_items and order_items for GST tiers, packaging type and local title
    try {
      try {
        await connection.query("ALTER TABLE menu_items ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE menu_items ADD COLUMN packaging_type ENUM('loose', 'packaged') NOT NULL DEFAULT 'packaged'")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE menu_items ADD COLUMN local_name VARCHAR(255) NULL DEFAULT NULL")
      } catch (_) {}
      try {
        await connection.query("ALTER TABLE order_items ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00")
      } catch (_) {}
      console.log("✅ Auto-migrated menu_items and order_items (added gst_rate, packaging_type, local_name)")
    } catch (e) {
      console.error("❌ Auto-migration of menu_items GST columns failed:", e.message)
    }

    // Auto-migrate to create bulk_order_chat_messages table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bulk_order_chat_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          enquiry_id INT NOT NULL,
          sender_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (enquiry_id) REFERENCES bulk_order_enquiries(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log("✅ Auto-migrated bulk_order_chat_messages table")
    } catch (e) {
      console.error("❌ Auto-migration of bulk_order_chat_messages failed:", e.message)
    }

    // Auto-migrate to create kitchen_agreement_signatures table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS kitchen_agreement_signatures (
          id INT AUTO_INCREMENT PRIMARY KEY,
          kitchen_id INT,
          user_id INT NOT NULL,
          agreement_version INT NOT NULL,
          accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45) NOT NULL,
          device_info VARCHAR(255) NOT NULL,
          app_version VARCHAR(50) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      console.log("✅ Auto-migrated kitchen_agreement_signatures table")
    } catch (e) {
      console.error("❌ Auto-migration of kitchen_agreement_signatures failed:", e.message)
    }

    // Auto-migrate to add KYC columns to kitchens table
    try {
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN aadhaar_number VARCHAR(12) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN aadhaar_card VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN pan_number VARCHAR(10) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN pan_card VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN aadhaar_card_back VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN kitchen_images JSON NULL AFTER cover_image")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN payout_mode ENUM('bank', 'upi') DEFAULT 'upi'")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN bank_account_name VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN bank_name VARCHAR(150) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN bank_account_number VARCHAR(50) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN bank_ifsc VARCHAR(20) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN upi_id VARCHAR(100) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_enabled TINYINT(1) DEFAULT 0")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_title VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_category ENUM('food', 'grocery', 'both') DEFAULT 'both'")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_discount_percent DECIMAL(5,2) DEFAULT 0.00")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_start_date DATETIME DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_end_date DATETIME DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_description TEXT DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_image VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE kitchens ADD COLUMN festival_offer_image_2 VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN festival_discount DECIMAL(10,2) DEFAULT 0.00")
      } catch (_) { }
      console.log("✅ Auto-migrated kitchens table with KYC, payout & festival offer columns")
    } catch (e) {
      console.error("❌ Auto-migration of kitchens KYC/festival columns failed:", e.message)
    }

    // Auto-migrate for delivery rider tables and columns
    try {
      // 1. Modify users role ENUM to support 'rider'
      try {
        await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'kitchen', 'customer', 'rider') NOT NULL")
      } catch (_) { }

      // 2. Create riders table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS riders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          vehicle_type VARCHAR(50) NOT NULL,
          vehicle_number VARCHAR(50) DEFAULT NULL,
          driving_license_number VARCHAR(50) DEFAULT NULL,
          aadhaar_number VARCHAR(12) NOT NULL,
          aadhaar_card VARCHAR(255) NOT NULL,
          aadhaar_card_back VARCHAR(255) NOT NULL,
          pan_number VARCHAR(10) NOT NULL,
          pan_card VARCHAR(255) NOT NULL,
          driving_license VARCHAR(255) DEFAULT NULL,
          payout_mode ENUM('bank', 'upi') DEFAULT 'upi',
          bank_account_name VARCHAR(255) DEFAULT NULL,
          bank_name VARCHAR(150) DEFAULT NULL,
          bank_account_number VARCHAR(50) DEFAULT NULL,
          bank_ifsc VARCHAR(20) DEFAULT NULL,
          upi_id VARCHAR(100) DEFAULT NULL,
          status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
          is_online TINYINT(1) NOT NULL DEFAULT 0,
          latitude DECIMAL(10, 8) DEFAULT NULL,
          longitude DECIMAL(11, 8) DEFAULT NULL,
          cash_collected DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      // 3. Create rider_agreement_signatures table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS rider_agreement_signatures (
          id INT AUTO_INCREMENT PRIMARY KEY,
          rider_id INT NOT NULL,
          user_id INT NOT NULL,
          agreement_version INT NOT NULL,
          accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45) NOT NULL,
          device_info VARCHAR(255) NOT NULL,
          app_version VARCHAR(20) NOT NULL,
          FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      // 4. Alter orders table to add delivery fields
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN rider_id INT DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(50) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(6) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN pickup_code VARCHAR(6) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN rider_latitude DECIMAL(10, 8) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN cancellation_reason VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE orders ADD COLUMN gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00")
      } catch (_) { }

      try {
        await connection.query("ALTER TABLE riders ADD COLUMN aadhaar_card_back VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE riders ADD COLUMN driving_license VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE riders ADD COLUMN payout_mode ENUM('bank', 'upi') DEFAULT 'upi'")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE riders ADD COLUMN bank_account_name VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE riders ADD COLUMN bank_name VARCHAR(150) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE riders ADD COLUMN bank_account_number VARCHAR(50) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE riders ADD COLUMN bank_ifsc VARCHAR(20) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE riders ADD COLUMN upi_id VARCHAR(100) DEFAULT NULL")
      } catch (_) { }

      console.log("✅ Auto-migrated delivery rider tables and payout columns")
    } catch (e) {
      console.error("❌ Auto-migration of delivery rider tables failed:", e.message)
    }

    // Auto-migrate rider agreement columns in site_settings
    try {
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN rider_agreement_url VARCHAR(500) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN rider_agreement_version INT NOT NULL DEFAULT 0")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN rider_agreement_updated_at TIMESTAMP DEFAULT NULL")
      } catch (_) { }
      console.log("✅ Auto-migrated rider agreement columns in site_settings")
    } catch (e) {
      console.error("❌ Auto-migration of rider agreement columns failed:", e.message)
    }

    // Auto-migrate user agreement columns in site_settings
    try {
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN user_agreement_url VARCHAR(500) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN user_agreement_version INT NOT NULL DEFAULT 0")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN user_agreement_updated_at TIMESTAMP DEFAULT NULL")
      } catch (_) { }
      console.log("✅ Auto-migrated user agreement columns in site_settings")
    } catch (e) {
      console.error("❌ Auto-migration of user agreement columns failed:", e.message)
    }

    // Auto-migrate support contact columns in site_settings
    try {
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN support_phone VARCHAR(50) DEFAULT '+91 40 3559 4439'")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN support_email VARCHAR(100) DEFAULT 'contact@elifelo.com'")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN support_address VARCHAR(255) DEFAULT 'Maharashtra, India'")
      } catch (_) { }
      console.log("✅ Auto-migrated support contact columns in site_settings")
    } catch (e) {
      console.error("❌ Auto-migration of support contact columns failed:", e.message)
    }

    // Auto-migrate payment & settlement management tables
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS rider_cash_remittances (
          id INT AUTO_INCREMENT PRIMARY KEY,
          rider_id INT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          utr_number VARCHAR(100) DEFAULT NULL,
          status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
          rejection_reason VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified_at TIMESTAMP DEFAULT NULL,
          FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      await connection.query(`
        ALTER TABLE rider_cash_remittances ADD COLUMN notes TEXT DEFAULT NULL
      `).catch(() => {})

      await connection.query(`
        CREATE TABLE IF NOT EXISTS settlements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          entity_type ENUM('kitchen', 'rider') NOT NULL,
          entity_id INT NOT NULL,
          period_type ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'weekly',
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          deductions_commissions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          deductions_rider_fees DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          cash_collected_deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          net_payout DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
          utr_number VARCHAR(100) DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          paid_at TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      try {
        await connection.query("ALTER TABLE settlements ADD COLUMN deductions_rider_fees DECIMAL(10, 2) NOT NULL DEFAULT 0.00")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE settlements ADD COLUMN deductions_gst DECIMAL(10, 2) NOT NULL DEFAULT 0.00")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN kitchen_payout_frequency VARCHAR(20) NOT NULL DEFAULT 'weekly'")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE site_settings ADD COLUMN rider_payout_frequency VARCHAR(20) NOT NULL DEFAULT 'weekly'")
      } catch (_) { }

      console.log("✅ Auto-migrated payment & settlement tables and settings")
    } catch (e) {
      console.error("❌ Auto-migration of payment & settlement tables failed:", e.message)
    }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS hygiene_checks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          kitchen_id INT NOT NULL,
          area VARCHAR(100) NOT NULL DEFAULT 'daily_check',
          media_url VARCHAR(255) NOT NULL,
          status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
          rejection_reason VARCHAR(255) DEFAULT NULL,
          reviewed_at TIMESTAMP NULL DEFAULT NULL,
          reviewed_by INT DEFAULT NULL,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      try {
        await connection.query("ALTER TABLE hygiene_checks ADD COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE hygiene_checks ADD COLUMN rejection_reason VARCHAR(255) DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE hygiene_checks ADD COLUMN reviewed_at TIMESTAMP NULL DEFAULT NULL")
      } catch (_) { }
      try {
        await connection.query("ALTER TABLE hygiene_checks ADD COLUMN reviewed_by INT DEFAULT NULL")
      } catch (_) { }

      console.log("✅ Auto-migrated hygiene_checks table with status columns")
    } catch (e) {
      console.error("❌ Auto-migration of hygiene_checks table failed:", e.message)
    }

    // Auto-migrate cms_policies table for Privacy Policy and Terms of Service
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cms_policies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type VARCHAR(50) NOT NULL UNIQUE,
          sections JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      const defaultPrivacy = [
        { id: "who", num: "01", title: "Who we are", content: "Atleast80 (\"we\", \"us\", \"our\") operates a marketplace connecting customers with verified home kitchens. This policy explains how we handle personal data when you use our website and mobile experience." },
        { id: "collect", num: "02", title: "Information we collect", content: "Customers: name, phone number, email, delivery address, order history, and payment-related metadata processed by our payment partners (we do not store full card numbers).\n\nKitchen partners: business and owner details, FSSAI or registration documents, kitchen photos, hygiene videos, menu data, bank or payout details, and communications with our team.\n\nAutomatically: device type, browser, IP address, and usage logs used for security and product improvement." },
        { id: "use", num: "03", title: "How we use your data", content: "To process orders, deliver food, verify kitchen hygiene, provide customer support, send transactional messages (order updates, OTPs), improve our platform, and comply with legal obligations." },
        { id: "share", num: "04", title: "Sharing of information", content: "We share limited data with kitchen partners (name, phone, delivery address for fulfilment), payment processors, delivery partners where applicable, and authorities when required by law. We do not sell your personal data." },
        { id: "hygiene", num: "05", title: "Hygiene videos", content: "Kitchen hygiene videos uploaded by sellers may be displayed to customers on the kitchen's public page to build trust. Videos are stored securely and removed according to our retention rules." },
        { id: "retention", num: "06", title: "Data retention", content: "We retain account and order data as long as your account is active and as needed for legal, tax, and dispute-resolution purposes. You may request deletion subject to applicable law." },
        { id: "rights", num: "07", title: "Your rights", content: "You may access, correct, or request deletion of your personal data by contacting us. Indian users may have rights under applicable data protection laws." },
        { id: "security", num: "08", title: "Security", content: "We use industry-standard measures including encrypted connections (HTTPS), access controls, and secure storage. No method of transmission over the internet is 100% secure." },
        { id: "children", num: "09", title: "Children", content: "Our services are not directed at children under 18. We do not knowingly collect data from minors." },
        { id: "contact", num: "10", title: "Contact", content: "For privacy questions: contact@elifelo.com · +91 40 3559 4439" }
      ]

      const defaultTerms = [
        { id: "acceptance", num: "01", title: "Acceptance", content: "By accessing or using Atleast80, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform." },
        { id: "role", num: "02", title: "Our role", content: "Atleast80 is a technology marketplace that connects customers with independent home kitchens. We are not the seller of food items — kitchens prepare and fulfil orders directly. We facilitate discovery, ordering, payments, and hygiene verification." },
        { id: "customers", num: "03", title: "Customer accounts", content: "You must provide accurate contact and delivery information. You are responsible for keeping your login credentials secure. Orders are binding once confirmed." },
        { id: "partners", num: "04", title: "Kitchen partner obligations", content: "Partners must maintain valid registrations (including FSSAI where applicable), upload daily hygiene videos, prepare food safely, honour listed prices, and fulfil orders on time. We may suspend or remove kitchens that violate hygiene standards, receive repeated complaints, or breach these terms." },
        { id: "orders", num: "05", title: "Orders, pricing & payments", content: "Prices are set by kitchens and displayed at checkout. Taxes and delivery fees may apply. Payments are processed through authorised payment partners. Refunds are handled per our refund policy and individual order circumstances." },
        { id: "hygiene", num: "06", title: "Hygiene & food safety", content: "Kitchens agree to follow our Hygiene Guidelines and applicable food safety laws. Customers acknowledge that home-cooked food carries inherent risks and should report concerns promptly." },
        { id: "conduct", num: "07", title: "Prohibited conduct", content: "Users may not misuse the platform, post false reviews, circumvent fees, upload misleading media, harass others, or use the service for unlawful purposes." },
        { id: "ip", num: "08", title: "Intellectual property", content: "Atleast80 branding, software, and content are owned by us or our licensors. Kitchens grant us a licence to display their menus, images, and hygiene content for platform operation." },
        { id: "liability", num: "09", title: "Limitation of liability", content: "To the fullest extent permitted by law, Atleast80 is not liable for indirect, incidental, or consequential damages arising from use of the platform, food quality issues between customers and kitchens, or service interruptions." },
        { id: "termination", num: "10", title: "Termination", content: "We may suspend or terminate accounts that violate these terms. You may stop using the service at any time. Provisions that should survive termination will remain in effect." },
        { id: "law", num: "11", title: "Governing law", content: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana." }
      ]

      await connection.query(
        "INSERT INTO cms_policies (type, sections) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id",
        ["privacy", JSON.stringify(defaultPrivacy)]
      )
      await connection.query(
        "INSERT INTO cms_policies (type, sections) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id",
        ["terms", JSON.stringify(defaultTerms)]
      )
      console.log("✅ Auto-migrated and seeded cms_policies table")

      try {
        await connection.query(`
          UPDATE settlements 
          SET deductions_rider_fees = GREATEST(0, gross_amount - deductions_commissions - net_payout)
          WHERE entity_type = 'kitchen' AND (deductions_rider_fees IS NULL OR deductions_rider_fees = 0) AND (gross_amount - deductions_commissions - net_payout > 0)
        `)
      } catch (_) {}
    } catch (e) {
      console.error("❌ Auto-migration of cms_policies table failed:", e.message)
    }

    // Auto-migrate grocery_presets table for Dynamic Grocery Gallery Management
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS grocery_presets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          preset_id VARCHAR(100) NULL,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL DEFAULT 'grocery',
          default_qty VARCHAR(50) NOT NULL DEFAULT '1',
          default_unit VARCHAR(50) NOT NULL DEFAULT 'kg',
          image TEXT NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          display_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active_order (is_active, display_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      const [existing] = await connection.query("SELECT COUNT(*) AS cnt FROM grocery_presets")
      if (existing[0]?.cnt === 0) {
        const initialSeeds = [
          ["g_sugar", "Sugar / Chini", "grocery", "1", "kg", "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop", 1, 1],
          ["g_atta", "Wheat Flour / Chakki Atta", "grocery", "5", "kg", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&auto=format&fit=crop", 1, 2],
          ["g_rice", "Basmati Rice", "grocery", "1", "kg", "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop", 1, 3],
          ["g_oil", "Cooking Oil / Refined Oil", "grocery", "1", "L", "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop", 1, 4],
          ["g_mustard_oil", "Mustard Oil / Sarson Tel", "grocery", "1", "L", "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=500&auto=format&fit=crop", 1, 5],
          ["g_salt", "Salt / Tata Namak", "grocery", "1", "kg", "https://images.unsplash.com/photo-1612203985729-70726954388c?w=500&auto=format&fit=crop", 1, 6],
          ["g_haldi", "Turmeric Powder / Haldi", "grocery", "200", "gm", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop", 1, 7],
          ["g_chili", "Red Chili Powder", "grocery", "200", "gm", "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=500&auto=format&fit=crop", 1, 8],
          ["g_toor_dal", "Toor Dal / Arhar Dal", "grocery", "1", "kg", "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&auto=format&fit=crop", 1, 9],
          ["g_moong_dal", "Moong Dal", "grocery", "1", "kg", "https://images.unsplash.com/photo-1585996824364-53900a30b5d5?w=500&auto=format&fit=crop", 1, 10],
          ["g_ghee", "Pure Cow Ghee", "grocery", "500", "ml", "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=500&auto=format&fit=crop", 1, 11],
          ["g_tea", "Tea Powder / Chai Patti", "grocery", "250", "gm", "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop", 1, 12],
          ["g_coffee", "Coffee Powder", "grocery", "100", "gm", "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop", 1, 13],
          ["g_poha", "Thick Poha / Flattened Rice", "grocery", "1", "kg", "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop", 1, 14],
          ["g_suji", "Suji / Rava", "grocery", "500", "gm", "https://images.unsplash.com/photo-1607349913338-fca6f7429606?w=500&auto=format&fit=crop", 1, 15],
          ["g_besan", "Gram Flour / Besan", "grocery", "500", "gm", "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500&auto=format&fit=crop", 1, 16],
          ["g_jeera", "Cumin Seeds / Jeera", "grocery", "100", "gm", "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop", 1, 17],
          ["g_mustard", "Mustard Seeds / Rai", "grocery", "100", "gm", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop", 1, 18],
          ["g_paneer", "Fresh Malai Paneer", "grocery", "200", "gm", "https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=500&auto=format&fit=crop", 1, 19],
          ["g_dahi", "Fresh Curd / Dahi", "grocery", "400", "gm", "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop", 1, 20],
          ["g_milk", "Fresh Milk", "grocery", "1", "L", "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop", 1, 21],
          ["g_butter", "Table Butter", "grocery", "100", "gm", "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop", 1, 22]
        ]
        for (const row of initialSeeds) {
          await connection.query(
            "INSERT INTO grocery_presets (preset_id, name, category, default_qty, default_unit, image, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            row
          )
        }
        console.log("✅ Seeded initial grocery_presets gallery")
      }
      console.log("✅ Auto-migrated grocery_presets table")
    } catch (e) {
      console.error("❌ Auto-migration of grocery_presets table failed:", e.message)
    }

    connection.release()
    console.log("✅ Database connected successfully")
    return pool
  } catch (error) {
    console.error("❌ Database connection failed:", error.message)
    throw error
  }
}

export default pool
