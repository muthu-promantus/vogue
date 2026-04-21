require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

module.exports = app;