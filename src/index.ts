import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import authService from './services/auth';
import leaderboardService from './services/leaderboard';
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


const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  const token = authHeader.substring(7);
  
  try {
    const result = await authService.validateToken(token);
    
    if (result.success) {
      const userAttributes = Object.fromEntries(
        result.data.attributes.map((attr: any) => [attr.Name, attr.Value])
      );
      
      req.user = {
        user_id: userAttributes.sub,
        user_name: userAttributes.preferred_username,
        name: userAttributes.name,
        email: userAttributes.email
      };
      
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token validation failed'
    });
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Nebula Challenge API is running' });
});

app.post('/register', async (req, res) => {
  try {
    const { email, preferred_username, name, password } = req.body;

    if (!email || !preferred_username || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, preferred_username, name, password'
      });
    }

    const result = await authService.registerUser({
      email,
      preferred_username,
      name,
      password
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/verify-otp', async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, code'
      });
    }

    const result = await authService.verifyOTP({
      username,
      code
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/resend-otp', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: username'
      });
    }

    const result = await authService.resendOTP(username);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, password'
      });
    }

    const result = await authService.loginUser({
      username,
      password
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      if (result.message === 'UserNotConfirmedException') {
        res.status(401).json({
          success: false,
          message: 'UserNotConfirmedException',
          data: result.data
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message
        });
      }
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/score', authenticateToken, async (req: any, res) => {
  try {
    const { score } = req.body;

    if (score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: score'
      });
    }

    const scoreNumber = Number(score);
    if (isNaN(scoreNumber) || scoreNumber < 0) {
      return res.status(400).json({
        success: false,
        message: 'Score must be a positive number'
      });
    }

    const user = req.user;

    const result = await leaderboardService.submitScore({
      user_id: user.user_id,
      user_name: user.user_name,
      score: scoreNumber
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('Score submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const result = await leaderboardService.getLeaderboard();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('Leaderboard retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.delete('/leaderboard', authenticateToken, async (req: any, res) => {
  try {
    const result = await leaderboardService.deleteAllScores();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('Delete leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Nebula Challenge API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app; 