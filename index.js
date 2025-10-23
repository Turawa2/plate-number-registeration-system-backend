const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const PORT = process.env.PORT || 9000;

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to Plate Number Database");
});

// Routes
app.use("/api/auth", require("./routes/auth")(db));
app.use("/api/plates", require("./routes/plates")(db));
app.use("/api/admin", require("./routes/admin")(db));

app.get("/", (req, res) => {
  res.send("Welcome to Nigerian Plate Number Registration System API");
});

app.listen(PORT, () => {
  console.log("🚗 Server is running on Port", PORT);
});