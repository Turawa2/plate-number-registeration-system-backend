module.exports = (db) => {
  const router = require("express").Router();

  // Helper function to format date for MySQL
  const formatDateForMySQL = (dateString) => {
    if (!dateString) return null;
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's an ISO string, extract the date part
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // Try to parse as date and format
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Date parsing error:', error);
      return null;
    }
  };

  // Get all plate numbers with search and pagination
  router.get("/", (req, res) => {
    try {
      const { search, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT p.*, a.full_name as created_by_name 
        FROM plate_numbers p 
        LEFT JOIN admins a ON p.created_by = a.id 
        WHERE 1=1
      `;
      let countQuery = `SELECT COUNT(*) as total FROM plate_numbers WHERE 1=1`;
      const params = [];
      const countParams = [];

      if (search) {
        query += ` AND (p.plate_number LIKE ? OR p.owner_name LIKE ? OR p.state LIKE ?)`;
        countQuery += ` AND (plate_number LIKE ? OR owner_name LIKE ? OR state LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      // Get total count
      db.query(countQuery, countParams, (err, countResults) => {
        if (err) {
          console.error("Count error:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        const total = countResults[0].total;

        // Get data
        db.query(query, params, (err, results) => {
          if (err) {
            console.error("Query error:", err);
            return res.status(500).json({
              success: false,
              message: "Internal server error",
            });
          }

          res.json({
            success: true,
            data: results,
            pagination: {
              current: parseInt(page),
              total: Math.ceil(total / limit),
              totalRecords: total,
            },
          });
        });
      });
    } catch (error) {
      console.error("Get plates error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Get plate by ID
  router.get("/:id", (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT p.*, a.full_name as created_by_name 
        FROM plate_numbers p 
        LEFT JOIN admins a ON p.created_by = a.id 
        WHERE p.id = ?
      `;

      db.query(query, [id], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        if (results.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Plate number not found",
          });
        }

        res.json({
          success: true,
          data: results[0],
        });
      });
    } catch (error) {
      console.error("Get plate error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Create new plate number
  router.post("/", (req, res) => {
    try {
      const { plate_number, owner_name, vehicle_type, state, registration_date, created_by } = req.body;

      if (!plate_number || !owner_name || !vehicle_type || !state || !registration_date) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Format date for MySQL
      const formattedDate = formatDateForMySQL(registration_date);
      if (!formattedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      // Check if plate number already exists
      const checkQuery = "SELECT id FROM plate_numbers WHERE plate_number = ?";
      db.query(checkQuery, [plate_number], (err, results) => {
        if (err) {
          console.error("Check error:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        if (results.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Plate number already exists",
          });
        }

        // Insert new plate number
        const insertQuery = `
          INSERT INTO plate_numbers 
          (plate_number, owner_name, vehicle_type, state, registration_date, created_by) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertQuery,
          [plate_number, owner_name, vehicle_type, state, formattedDate, created_by],
          (err, results) => {
            if (err) {
              console.error("Insert error:", err);
              return res.status(500).json({
                success: false,
                message: "Internal server error",
              });
            }

            res.status(201).json({
              success: true,
              message: "Plate number registered successfully",
              data: {
                id: results.insertId,
                plate_number,
                owner_name,
                vehicle_type,
                state,
                registration_date: formattedDate,
              },
            });
          }
        );
      });
    } catch (error) {
      console.error("Create plate error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Update plate number
  router.put("/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { plate_number, owner_name, vehicle_type, state, registration_date } = req.body;

      if (!plate_number || !owner_name || !vehicle_type || !state || !registration_date) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Format date for MySQL
      const formattedDate = formatDateForMySQL(registration_date);
      if (!formattedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      // Check if plate number already exists (excluding current record)
      const checkQuery = "SELECT id FROM plate_numbers WHERE plate_number = ? AND id != ?";
      db.query(checkQuery, [plate_number, id], (err, results) => {
        if (err) {
          console.error("Check error:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        if (results.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Plate number already exists",
          });
        }

        // Update plate number
        const updateQuery = `
          UPDATE plate_numbers 
          SET plate_number = ?, owner_name = ?, vehicle_type = ?, state = ?, registration_date = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;

        db.query(
          updateQuery,
          [plate_number, owner_name, vehicle_type, state, formattedDate, id],
          (err, results) => {
            if (err) {
              console.error("Update error:", err);
              return res.status(500).json({
                success: false,
                message: "Internal server error",
              });
            }

            if (results.affectedRows === 0) {
              return res.status(404).json({
                success: false,
                message: "Plate number not found",
              });
            }

            res.json({
              success: true,
              message: "Plate number updated successfully",
            });
          }
        );
      });
    } catch (error) {
      console.error("Update plate error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Delete plate number
  router.delete("/:id", (req, res) => {
    try {
      const { id } = req.params;

      const query = "DELETE FROM plate_numbers WHERE id = ?";

      db.query(query, [id], (err, results) => {
        if (err) {
          console.error("Delete error:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Plate number not found",
          });
        }

        res.json({
          success: true,
          message: "Plate number deleted successfully",
        });
      });
    } catch (error) {
      console.error("Delete plate error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
};