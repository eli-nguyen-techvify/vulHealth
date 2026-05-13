const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

const db = require('./db');

const PORT = process.env.PORT || 3005;
const app = express();

// VULN A05: permissive CORS with credentials
app.use(cors({
  origin: (origin, cb) => cb(null, true), // reflect any origin
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// VULN: Serve uploads statically — combined with unrestricted upload = XSS / RCE via .html/.php when behind php handler
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); // deliberately not strict
  },
}));

// VULN A05: Swagger docs exposed publicly
const swaggerDoc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'swagger.json'), 'utf-8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Banner / health
app.get('/', (req, res) => {
  res.json({
    app: 'VulHealth API',
    version: '1.0.0',
    docs: '/api-docs',
    env: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/records', require('./routes/records'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// VULN A01: open redirect
app.get('/api/redirect', (req, res) => {
  const url = req.query.url || '/';
  res.redirect(url);
});

// VULN A05: verbose error handler leaks stack trace
app.use((err, req, res, next) => {
  console.error('[err]', err);
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    sql: err.sql || undefined,
  });
});

async function bootstrap() {
  await db.init();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[vulhealth] listening on http://0.0.0.0:${PORT}`);
    console.log(`[vulhealth] docs at /api-docs`);
  });
}

bootstrap().catch((e) => {
  console.error('bootstrap failed', e);
  process.exit(1);
});
