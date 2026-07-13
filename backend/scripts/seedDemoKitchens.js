import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import pool from "../src/config/db.js"

dotenv.config()

const kitchensData = [
  {
    email: "maa@kitchen.com",
    password: "password123",
    name: "Maa Ki Rasoi",
    owner_name: "Rajni Sharma",
    phone: "9876543210",
    address: "Sector 4, Vikas Nagar, Lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226022",
    speciality: "North Indian Thali, Dal Makhani, Paneer Butter Masala",
    kitchen_type: "veg",
    fssai_number: "22722005000123",
    fssai_license: null,
    opening_time: "8 AM - 10 PM",
    description: "Home-cooked vegetarian meals made with pure love and fresh ingredients. Low oil, no preservatives, and pure authentic taste just like your home.",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    cover_image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80",
    status: "approved",
    is_featured: 1,
    featured_order: 1,
    hygiene_score: 98,
    rating: 4.8,
    rating_count: 124,
    delivery_time: "25-35 min",
    offer: "10% OFF on orders above ₹199",
    best_item: "Special Veg Thali",
    visibility_status: "visible",
    menu_items: [
      {
        name: "Special Veg Thali",
        description: "A complete meal containing Paneer Subji, Seasonal Veg, Dal Fry, 4 Roti, Rice, Salad, and Sweet.",
        price: 150.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Paneer Butter Masala",
        description: "Rich and creamy paneer cooked in a tomato-butter gravy.",
        price: 180.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Home-style Dal Fry",
        description: "Yellow lentils cooked with authentic Indian tempering of ghee, cumin, and garlic.",
        price: 100.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Tawa Roti (Ghee)",
        description: "Soft wheat rotis smeared with fresh desi ghee.",
        price: 10.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Desi Kheer",
        description: "Traditional rice pudding cooked slowly with milk and dry fruits.",
        price: 60.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
        is_available: true
      }
    ]
  },
  {
    email: "awadhi@kitchen.com",
    password: "password123",
    name: "The Awadhi Table",
    owner_name: "Imran Khan",
    phone: "9876543211",
    address: "Chowk, Near Akbari Gate, Lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226003",
    speciality: "Lukhnowi Biryani, Galouti Kebab, Sheermal",
    kitchen_type: "both",
    fssai_number: "22722005000456",
    fssai_license: null,
    opening_time: "12 PM - 11 PM",
    description: "Relish the authentic royal flavors of Awadhi cuisine cooked using traditional slow-cooking (dum) methods and handpicked spices.",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
    cover_image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    status: "approved",
    is_featured: 1,
    featured_order: 2,
    hygiene_score: 95,
    rating: 4.9,
    rating_count: 250,
    delivery_time: "40-50 min",
    offer: "Flat ₹50 OFF on Biryanis",
    best_item: "Awadhi Chicken Biryani",
    visibility_status: "visible",
    menu_items: [
      {
        name: "Awadhi Chicken Biryani (Dum)",
        description: "Slow cooked aromatic basmati rice layered with marinated chicken and saffron.",
        price: 220.00,
        category: "food",
        item_type: "non_veg",
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Galouti Kebab (4 pcs)",
        description: "Melt-in-your-mouth minced mutton kebabs flavored with secret spices.",
        price: 190.00,
        category: "food",
        item_type: "non_veg",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Sheermal",
        description: "Sweet saffron-flavored flatbread baked in a tandoor.",
        price: 50.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Veg Dum Biryani",
        description: "Aromatic rice cooked with seasonal vegetables and special Awadhi spices.",
        price: 170.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
        is_available: true
      }
    ]
  },
  {
    email: "healthy@kitchen.com",
    password: "password123",
    name: "Nutan's Healthy Bites",
    owner_name: "Nutan Bajpai",
    phone: "9876543212",
    address: "B-Block, Indira Nagar, Lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226016",
    speciality: "Salads, Oats Meal, Diet Thali, Multigrain Roti",
    kitchen_type: "veg",
    fssai_number: "22722005000789",
    fssai_license: null,
    opening_time: "7 AM - 9 PM",
    description: "Stay fit and active with our dietitian-designed, healthy, high-protein, and calorie-counted meals. Absolutely zero sugar and zero refined oil.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    cover_image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    status: "approved",
    is_featured: 1,
    featured_order: 3,
    hygiene_score: 99,
    rating: 4.7,
    rating_count: 85,
    delivery_time: "30-40 min",
    offer: "Free Delivery on orders above ₹299",
    best_item: "High Protein Salad Bowl",
    visibility_status: "visible",
    menu_items: [
      {
        name: "High Protein Salad Bowl",
        description: "Loaded with paneer, sprouts, chickpeas, broccoli, and a light olive-lemon dressing.",
        price: 140.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Diet Veg Thali",
        description: "Brown rice, 2 multigrain rotis, boiled dal, green subji, and cucumber raita.",
        price: 160.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Savory Masala Oats",
        description: "Savory rolled oats cooked with fresh herbs, bell peppers, and carrots.",
        price: 90.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Green Detox Smoothie",
        description: "Fresh blend of spinach, apple, cucumber, mint, and lemon juice.",
        price: 80.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
        is_available: true
      }
    ]
  },
  {
    email: "annapurna@kitchen.com",
    password: "password123",
    name: "Annapurna Sweets & Snacks",
    owner_name: "Sanjay Gupta",
    phone: "9876543213",
    address: "Sector H, Aliganj, Lucknow",
    city: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226024",
    speciality: "Samosa, Jalebi, Gulab Jamun, Dhokla",
    kitchen_type: "veg",
    fssai_number: "22722005000999",
    fssai_license: null,
    opening_time: "9 AM - 9 PM",
    description: "Delicious, fresh, and hygienic street snacks and traditional Indian sweets prepared in pure desi ghee.",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
    cover_image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=1200&q=80",
    status: "approved",
    is_featured: 0,
    featured_order: 0,
    hygiene_score: 94,
    rating: 4.6,
    rating_count: 140,
    delivery_time: "20-30 min",
    offer: "Buy 4 Samosas Get 1 Free Jalebi",
    best_item: "Ghee Samosa with Chutney",
    visibility_status: "visible",
    menu_items: [
      {
        name: "Desi Ghee Samosa (2 pcs)",
        description: "Crispy potato-filled pastries deep-fried in pure desi ghee, served with tamarind chutney.",
        price: 40.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Kesariya Jalebi (100g)",
        description: "Hot, crispy, and juicy saffron jalebis made fresh on order.",
        price: 50.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Spongy Dhokla (4 pcs)",
        description: "Steamed Gujarati dhokla made with gram flour, tempered with mustard seeds and curry leaves.",
        price: 60.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        is_available: true
      },
      {
        name: "Special Masala Chai (Flask)",
        description: "Freshly brewed milk tea with ginger, cardamom, and secret masala spices (serves 2).",
        price: 50.00,
        category: "food",
        item_type: "veg",
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
        is_available: true
      }
    ]
  }
]

async function seedKitchens() {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    console.log("Cleaning up old demo kitchens if they exist...")
    // Find old demo kitchen emails
    const emails = kitchensData.map(k => k.email)
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email IN (?) AND role = 'kitchen'",
      [emails]
    )

    if (existingUsers.length > 0) {
      const userIds = existingUsers.map(u => u.id)
      console.log(`Deleting ${userIds.length} existing demo kitchens/users...`)
      await connection.query("DELETE FROM users WHERE id IN (?)", [userIds])
    }

    for (const kitchen of kitchensData) {
      console.log(`Inserting user for kitchen: ${kitchen.name} (${kitchen.email})`)
      const passwordHash = bcrypt.hashSync(kitchen.password, 10)
      
      const [userResult] = await connection.query(
        "INSERT INTO users (role, name, email, phone, password_hash) VALUES ('kitchen', ?, ?, ?, ?)",
        [kitchen.name, kitchen.email, kitchen.phone, passwordHash]
      )

      const userId = userResult.insertId

      console.log(`Inserting kitchen profile for: ${kitchen.name}`)
      const [kitchenResult] = await connection.query(
        `INSERT INTO kitchens (
          user_id, name, owner_name, email, phone, address, city, state, pincode,
          speciality, kitchen_type, fssai_number, fssai_license, opening_time,
          description, image, cover_image, status, is_featured, featured_order,
          hygiene_score, rating, rating_count, delivery_time, offer, best_item, visibility_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          kitchen.name,
          kitchen.owner_name,
          kitchen.email,
          kitchen.phone,
          kitchen.address,
          kitchen.city,
          kitchen.state,
          kitchen.pincode,
          kitchen.speciality,
          kitchen.kitchen_type,
          kitchen.fssai_number,
          kitchen.fssai_license,
          kitchen.opening_time,
          kitchen.description,
          kitchen.image,
          kitchen.cover_image,
          kitchen.status,
          kitchen.is_featured,
          kitchen.featured_order,
          kitchen.hygiene_score,
          kitchen.rating,
          kitchen.rating_count,
          kitchen.delivery_time,
          kitchen.offer,
          kitchen.best_item,
          kitchen.visibility_status
        ]
      )

      const kitchenId = kitchenResult.insertId

      console.log(`Inserting ${kitchen.menu_items.length} menu items for: ${kitchen.name}`)
      for (const item of kitchen.menu_items) {
        await connection.query(
          `INSERT INTO menu_items (
            kitchen_id, name, description, price, category, item_type, image, is_available, approval_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
          [
            kitchenId,
            item.name,
            item.description,
            item.price,
            item.category,
            item.item_type,
            item.image,
            item.is_available
          ]
        )
      }
    }

    await connection.commit()
    console.log("✅ Successfully seeded 4 demo kitchens with realistic data & menus!")
    process.exit(0)
  } catch (error) {
    await connection.rollback()
    console.error("❌ Seeding failed:", error)
    process.exit(1)
  } finally {
    connection.release()
  }
}

seedKitchens()
