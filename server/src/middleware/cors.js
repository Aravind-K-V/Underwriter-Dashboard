import cors from 'cors';

export const setupCors = (app) => {
  app.use(cors({
    origin: ['http://13.202.6.228:3000', 'http://13.202.6.228:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));
};