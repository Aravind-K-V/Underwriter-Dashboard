import cors from 'cors';

export const setupCors = (app) => {
  app.use(cors({
    origin: ['http://13.232.45.218:3000', 'http://13.232.45.218:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));
};