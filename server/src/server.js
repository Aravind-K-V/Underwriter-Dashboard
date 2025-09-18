import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { setupCors } from './middleware/cors.js';
import { setupLogging } from './middleware/logging.js';
import { logger, prettyLog } from './config/logger.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import documentRoutes from './routes/documents.js';
import FinanceProcessingRoutes from './routes/finance_document_processing.js';
import MedicalProcessingRoutes from './routes/medical_document_processing.js'
import proposerRoutes from './routes/proposers.js';
import underwritingRoutes from './routes/underwriting.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

//  CORS Configuration
const corsOptions = {
  origin: ['http://13.232.45.218:3000', 'http://13.232.45.218:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
};

app.use(cors(corsOptions));

// Apply other middleware
setupCors(app);
setupLogging();
app.use(express.json());

// Log server startup
prettyLog('Starting server with configuration', {
  EMAIL_USER: process.env.EMAIL_USER || 'undefined',
  EMAIL_PASS: process.env.EMAIL_PASS ? '**** (loaded)' : 'undefined',
  USE_SENDGRID: process.env.USE_SENDGRID || 'false',
  PORT: PORT,
  CORS_ORIGINS: corsOptions.origin
}, { level: 'info' });

// Debug: Verify route imports
console.info('[Server][Startup] Route imports verification started');
console.debug('[Server][Startup] MedicalProcessingRoutes type:', typeof MedicalProcessingRoutes);
console.debug('[Server][Startup] MedicalProcessingRoutes available:', MedicalProcessingRoutes ? 'Yes' : 'No');
console.debug('[Server][Startup] UnderwritingRoutes available:', underwritingRoutes ? 'Yes' : 'No');

//  FIXED: Mount routes with proper namespacing
app.use('/api', authRoutes);
app.use('/api', customerRoutes);
app.use('/api', documentRoutes);
app.use('/api/finance-document-processing', FinanceProcessingRoutes);
app.use('/api/medical-document-processing', MedicalProcessingRoutes);
app.use('/api', proposerRoutes);
app.use('/api/underwriting', underwritingRoutes);

console.info('[Server][Routes] All API routes mounted successfully');

//  Test endpoint to verify CORS is working
app.get('/api/test', (req, res) => {
  console.info('[Server][CORS] Test endpoint accessed');
  res.json({ 
    message: 'CORS is working!', 
    timestamp: new Date().toISOString() 
  });
});

// Debug route to list all available endpoints
app.get('/debug/routes', (req, res) => {
  console.info('[Server][Debug] Routes listing requested');
  const routes = [];
  
  function extractRoutes(stack, basePath = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        // Direct route
        routes.push({
          path: basePath + middleware.route.path,
          methods: Object.keys(middleware.route.methods).map(method => method.toUpperCase())
        });
      } else if (middleware.name === 'router') {
        // Router middleware
        const routerBasePath = middleware.regexp.source
          .replace('^\\\/', '')
          .replace('\\/?(?=\\\\/|\\\\?|$)', '')
          .replace(/\\\//g, '/');
        
        if (middleware.handle && middleware.handle.stack) {
          extractRoutes(middleware.handle.stack, routerBasePath);
        }
      }
    });
  }
  
  extractRoutes(app._router.stack);
  
  console.debug('[Server][Debug] Routes extracted:', { totalRoutes: routes.length });
  
  res.json({ 
    message: 'Available routes in the application',
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    totalRoutes: routes.length
  });
});

// Start server
app.listen(PORT, () => {
  prettyLog('Server started successfully', {
    port: PORT,
    url: `http://13.232.45.218:${PORT}`,
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    corsEnabled: true,
    routes: {
      auth: '/api',
      customers: '/api', 
      documents: '/api',
      financeProcessing: '/api/finance-document-processing',
      medicalProcessing: '/api/medical-document-processing',
      proposers: '/api',
      underwriting: '/api/underwriting'
    }
  }, { level: 'info' });
  
  console.info('[Server][Startup] Server initialized successfully on port', PORT);
  console.info('[Server][Startup] All middleware and routes configured');
  console.info('[Server][Startup] Ready to accept incoming requests');
});
