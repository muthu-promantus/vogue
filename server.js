require('dotenv').config();

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ simple test route (important for debugging)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get("/", (req, res) => {
    res.send("ROOT HIT EXPRESS");
});
// API: Get all products
app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });
    
    if (error) return res.status(500).json(error);
    res.json(data);
});

// API: Add new product
app.post('/api/products', async (req, res) => {
    const { name, price, stock } = req.body;
    const { data, error } = await supabase
        .from('products')
        .insert([{ name, price, stock }])
        .select();

    if (error) return res.status(500).json(error);
    res.json({ id: data[0].id });
});

// API: Checkout (Update stock and log sale)
app.delete('/api/products/:id', (req, res) => {
    db.run("DELETE FROM products WHERE id = ?", req.params.id, () => res.sendStatus(200));
});

app.post('/api/checkout', async (req, res) => {
    const { items, total } = req.body;

    try {
        // 1. Update stock for each item
        for (const item of items) {
            const { error: stockError } = await supabase
                .rpc('decrement_stock', { row_id: item.id, qty: item.quantity });
            
            if (stockError) throw stockError;
        }

        // 2. Record the sale
        const { error: saleError } = await supabase
            .from('sales')
            .insert([{ total_amount: total }]);

        if (saleError) throw saleError;

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales/today', async (req, res) => {
    try {
        const { data, error } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', new Date().toISOString().split('T')[0]); // today

        if (error) throw error;

        const dailyTotal = data.reduce(
        (sum, row) => sum + Number(row.total_amount || 0),
        0
        );

        res.json({ dailyTotal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sales/all', async (req, res) => {
    try {
        // Fetch id, amount, and date for all sales
        const { data: sales, error } = await supabase
            .from('sales')
            .select('id, total_amount, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate today's total specifically for the dashboard cards
        const today = new Date().toISOString().split('T')[0];
        const dailyTotal = sales
            .filter(sale => sale.created_at.startsWith(today))
            .reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

        res.json({ 
            dailyTotal, 
            history: sales 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Then frontend routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Catch-all (important: keep LAST)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`Local dev: http://localhost:${PORT}`));
}

module.exports = app;