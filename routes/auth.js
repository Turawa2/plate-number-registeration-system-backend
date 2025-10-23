module.exports = (db) => {
  const router = require("express").Router();

  // Admin login
  router.post("/login", (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const query = "SELECT id, email, full_name FROM admins WHERE email = ? AND password = ?";
      db.query(query, [email, password], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        if (results.length === 0) {
          return res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
        }

        const admin = results[0];

        res.json({
          success: true,
          message: "Login successful",
          admin: {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
          },
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
};