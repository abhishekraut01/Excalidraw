// index.ts
import dotenv from 'dotenv';
import path from 'path';
import { server } from './utils/Socket';
import { connectDB } from './db/connectDb';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Start the server after successful DB connection
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server started on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`❌ Error connecting to the database: ${err.message}`);
    process.exit(1);
  });