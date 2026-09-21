require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const routeModules = ['auth', 'users', 'products', 'batches', 'orders', 'disputes', 'schemes', 'mock-sap', 'analytics', 'claude', 'public'];

routeModules.forEach(route => {
    try {
        app.use(`/api/${route}`, require(`./routes/${route}`));
    } catch (e) {
        console.warn(`Route /api/${route} could not be loaded: ${e.message}`);
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`TradeChain backend server running on port ${PORT}`);
});
