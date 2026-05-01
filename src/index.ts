import app from "./app";
import "dotenv/config";

const PORT = process.env.PORT || 3000;


// Jalankan server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});