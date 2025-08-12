import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import authRoutes from './routes/auth';
import leaderboardRoutes from './routes/leaderboard';
import dotenv from 'dotenv';
import path from 'path';


const envPath = path.resolve(__dirname, '../.env');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: envPath });
}

console.log('[DEBUG] Using .env path:', envPath);
console.log('[DEBUG] Loaded PORT:', process.env.PORT);


const app = express();
const server = createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://nebula-challenge-frontend.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());


app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Nebula Challenge API is running' });
});

app.use('/', authRoutes);
app.use('/', leaderboardRoutes);

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Nebula Challenge API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app; 