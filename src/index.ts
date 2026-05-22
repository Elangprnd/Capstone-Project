import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 3000;


// Only start the server if we're not running in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  });
}
   
// Mandatory for Vercel to wrap the app
export default app;