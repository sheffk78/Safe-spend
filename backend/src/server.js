require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/auth');
const escrowAccountsRoutes = require('./routes/escrow-accounts');
const policiesRoutes = require('./routes/policies');
const spendRoutes = require('./routes/spend');
const approvalsRoutes = require('./routes/approvals');
const auditRoutes = require('./routes/audit');
const webhooksRoutes = require('./routes/webhooks');
const apiKeysRoutes = require('./routes/api-keys');
const stripeWebhookRoutes = require('./routes/stripe-webhook');

const app = express();

// IMPORTANT: Stripe webhook route must be registered BEFORE body parsing middleware
// because it needs the raw body for signature verification
app.use('/api/stripe', stripeWebhookRoutes);

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGINS === '*' ? '*' : process.env.CORS_ORIGINS?.split(','),
    credentials: true
}));
app.use(express.json());

// Trust proxy for proper IP detection behind Kubernetes
app.set('trust proxy', true);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/escrow-accounts', escrowAccountsRoutes);
app.use('/api/v1/policies', policiesRoutes);
app.use('/api/v1/spend', spendRoutes);
app.use('/api/v1/approvals', approvalsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/webhooks', webhooksRoutes);
app.use('/api/v1/api-keys', apiKeysRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8001;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Safe-Spend API server running on port ${PORT}`);
        console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
    });
}

module.exports = app;
