import cors from "cors";

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://voletra-frontend.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001"
].filter(Boolean).map(url => url?.toString().replace(/\/$/, "")) as string[];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.error('--- CORS REJECTED ---');
      console.error('Origin:', origin);
      console.error('Allowed Origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
});
