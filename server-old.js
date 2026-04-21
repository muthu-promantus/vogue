const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Database Setup
const db = new sqlite3.Database('./boutique.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to SQLite database.');
});

// Create Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        total_amount REAL
    )`);
});

// This tells Express that anything in 'public' should be served directly
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve index.html for the home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => res.json(rows));
});

app.post('/api/products', (req, res) => {
    const { name, price, stock } = req.body;
    db.run("INSERT INTO products (name, price, stock) VALUES (?, ?, ?)", [name, price, stock], function(err) {
        res.json({ id: this.lastID });
    });
});

app.delete('/api/products/:id', (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", req.params.id, () => res.sendStatus(200));
});

app.post('/api/checkout', (req, res) => {
    const { items, total } = req.body;
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        items.forEach(item => {
            db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id]);
        });
        db.run("INSERT INTO sales (total_amount) VALUES (?)", [total]);
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).send("Transaction failed");
            res.json({ success: true });
        });
    });
});

app.get('/api/sales/today', (req, res) => {
    db.get("SELECT SUM(total_amount) as dailyTotal FROM sales WHERE date >= date('now')", (err, row) => {
        res.json(row || { dailyTotal: 0 });
    });
});

// At the bottom of server.js
// Remove or wrap your app.listen
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`Local dev: http://localhost:${PORT}`));
}

// THIS IS THE KEY FOR VERCEL
module.exports = app;