
import dotenv from "dotenv";
import path from "path";
import app from "./app";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
