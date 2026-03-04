import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("restaurant.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS sandwiches (
    id TEXT PRIMARY KEY,
    name TEXT,
    price REAL,
    image TEXT,
    calories INTEGER,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer TEXT,
    items INTEGER,
    total REAL,
    time TEXT,
    status TEXT,
    paymentMethod TEXT,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating INTEGER,
    message TEXT,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name TEXT,
    manager TEXT,
    phone TEXT,
    isApproved INTEGER,
    joinedDate TEXT
  );

  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    phone TEXT,
    location TEXT,
    weekdays_hours TEXT,
    friday_hours TEXT,
    instagram TEXT,
    facebook TEXT,
    twitter TEXT
  );
`);

// Seed initial data if empty
const sandwichCount = db.prepare("SELECT count(*) as count FROM sandwiches").get() as { count: number };
if (sandwichCount.count === 0) {
  const initialSandwiches = [
    { id: '1', name: 'بيتزا مارجريتا', price: 35.0, image: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&q=80&w=800', calories: 850, description: 'عجينة طازجة، صلصة طماطم إيطالية، جبنة موزاريلا وريحان.' },
    { id: '2', name: 'بيتزا خضار', price: 38.0, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800', calories: 780, description: 'فلفل رومي، زيتون، فطر، بصل، وجبنة موزاريلا.' },
    { id: '3', name: 'فطيرة زعتر', price: 8.0, image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&q=80&w=800', calories: 280, description: 'زعتر بلدي مع زيت زيتون بكر على عجينة هشة.' },
    { id: '4', name: 'فطيرة جبنة عكاوي', price: 12.0, image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&q=80&w=800', calories: 350, description: 'جبنة عكاوي فاخرة مخبوزة في الفرن الحجري.' },
    { id: '5', name: 'ساندوتش فلافل كلاسيك', price: 10.0, image: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?auto=format&fit=crop&q=80&w=800', calories: 420, description: 'فلافل مقرمشة، طحينة، مخلل، طماطم وخس في خبز طازج.' },
    { id: '6', name: 'صحن فلافل مشكل', price: 25.0, image: 'https://images.unsplash.com/photo-1547058881-80ddbb13f513?auto=format&fit=crop&q=80&w=800', calories: 650, description: 'فلافل، حمص، متبل، سلطة، ومخللات متنوعة.' }
  ];
  const insert = db.prepare("INSERT INTO sandwiches (id, name, price, image, calories, description) VALUES (?, ?, ?, ?, ?, ?)");
  initialSandwiches.forEach(s => insert.run(s.id, s.name, s.price, s.image, s.calories, s.description));
}

const configCount = db.prepare("SELECT count(*) as count FROM config").get() as { count: number };
if (configCount.count === 0) {
  db.prepare(`
    INSERT INTO config (id, phone, location, weekdays_hours, friday_hours, instagram, facebook, twitter)
    VALUES (1, '+966 54 414 1303', 'الرياض، المملكة العربية السعودية', '10:00 ص - 12:00 م', '1:00 م - 1:00 ص', 'https://instagram.com', 'https://facebook.com', 'https://twitter.com')
  `).run();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Sandwiches
  app.get("/api/sandwiches", (req, res) => {
    const rows = db.prepare("SELECT * FROM sandwiches").all();
    res.json(rows);
  });

  app.post("/api/sandwiches", (req, res) => {
    const { id, name, price, image, calories, description } = req.body;
    db.prepare("INSERT INTO sandwiches (id, name, price, image, calories, description) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, name, price, image, calories, description);
    res.json({ success: true });
  });

  app.put("/api/sandwiches/:id", (req, res) => {
    const { name, price, image, calories, description } = req.body;
    db.prepare("UPDATE sandwiches SET name = ?, price = ?, image = ?, calories = ?, description = ? WHERE id = ?")
      .run(name, price, image, calories, description, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/sandwiches/:id", (req, res) => {
    db.prepare("DELETE FROM sandwiches WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Orders
  app.get("/api/orders", (req, res) => {
    const rows = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
    res.json(rows.map((r: any) => ({ ...r, details: JSON.parse(r.details) })));
  });

  app.post("/api/orders", (req, res) => {
    const { id, customer, items, total, time, status, paymentMethod, details } = req.body;
    db.prepare("INSERT INTO orders (id, customer, items, total, time, status, paymentMethod, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, customer, items, total, time, status, paymentMethod, JSON.stringify(details));
    res.json({ success: true });
  });

  app.put("/api/orders/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Reviews
  app.get("/api/reviews", (req, res) => {
    const rows = db.prepare("SELECT * FROM reviews ORDER BY date DESC").all();
    res.json(rows);
  });

  app.post("/api/reviews", (req, res) => {
    const { id, name, rating, message, date } = req.body;
    db.prepare("INSERT INTO reviews (id, name, rating, message, date) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, rating, message, date);
    res.json({ success: true });
  });

  // Branches
  app.get("/api/branches", (req, res) => {
    const rows = db.prepare("SELECT * FROM branches").all();
    res.json(rows.map((r: any) => ({ ...r, isApproved: !!r.isApproved })));
  });

  app.post("/api/branches", (req, res) => {
    const { id, name, manager, phone, isApproved, joinedDate } = req.body;
    db.prepare("INSERT INTO branches (id, name, manager, phone, isApproved, joinedDate) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, name, manager, phone, isApproved ? 1 : 0, joinedDate);
    res.json({ success: true });
  });

  app.put("/api/branches/:phone/approval", (req, res) => {
    const { isApproved } = req.body;
    db.prepare("UPDATE branches SET isApproved = ? WHERE phone = ?").run(isApproved ? 1 : 0, req.params.phone);
    res.json({ success: true });
  });

  app.put("/api/branches", (req, res) => {
    const branches = req.body;
    db.prepare("DELETE FROM branches").run();
    const insert = db.prepare("INSERT INTO branches (id, name, manager, phone, isApproved, joinedDate) VALUES (?, ?, ?, ?, ?, ?)");
    branches.forEach((b: any) => insert.run(b.id, b.name, b.manager, b.phone, b.isApproved ? 1 : 0, b.joinedDate));
    res.json({ success: true });
  });

  // Config
  app.get("/api/config", (req, res) => {
    const row = db.prepare("SELECT * FROM config WHERE id = 1").get() as any;
    res.json({
      phone: row.phone,
      location: row.location,
      workingHours: {
        weekdays: row.weekdays_hours,
        friday: row.friday_hours
      },
      socialLinks: {
        instagram: row.instagram,
        facebook: row.facebook,
        twitter: row.twitter
      }
    });
  });

  app.put("/api/config", (req, res) => {
    const { phone, location, workingHours, socialLinks } = req.body;
    db.prepare(`
      UPDATE config SET 
        phone = ?, 
        location = ?, 
        weekdays_hours = ?, 
        friday_hours = ?, 
        instagram = ?, 
        facebook = ?, 
        twitter = ? 
      WHERE id = 1
    `).run(phone, location, workingHours.weekdays, workingHours.friday, socialLinks.instagram, socialLinks.facebook, socialLinks.twitter);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 3000, host: "0.0.0.0" },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
