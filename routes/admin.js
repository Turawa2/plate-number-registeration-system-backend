module.exports = (db) => {
  const router = require("express").Router();

  // Get dashboard statistics
  router.get("/stats", (req, res) => {
    try {
      const queries = {
        totalPlates: "SELECT COUNT(*) as count FROM plate_numbers",
        totalStates: "SELECT COUNT(DISTINCT state) as count FROM plate_numbers",
        totalOwners: "SELECT COUNT(DISTINCT owner_name) as count FROM plate_numbers",
        thisMonth: `
          SELECT COUNT(*) as count FROM plate_numbers 
          WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
          AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `,
      };

      const stats = {};
      let completedQueries = 0;
      const totalQueries = Object.keys(queries).length;

      Object.keys(queries).forEach((key) => {
        db.query(queries[key], (err, results) => {
          if (err) {
            console.error(`Error fetching ${key}:`, err);
            stats[key] = 0;
          } else {
            stats[key] = results[0].count;
          }

          completedQueries++;
          if (completedQueries === totalQueries) {
            res.json({
              success: true,
              data: {
                totalPlates: stats.totalPlates,
                uniqueStates: stats.totalStates,
                vehicleOwners: stats.totalOwners,
                thisMonth: stats.thisMonth,
              },
            });
          }
        });
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Export plates as CSV
  router.get("/export/csv", (req, res) => {
    try {
      const query = `
        SELECT plate_number, owner_name, vehicle_type, state, registration_date, created_at 
        FROM plate_numbers 
        ORDER BY created_at DESC
      `;

      db.query(query, (err, results) => {
        if (err) {
          console.error("Export error:", err);
          return res.status(500).json({
            success: false,
            message: "Internal server error",
          });
        }

        // Convert to CSV
        const headers = ['Plate Number', 'Owner Name', 'Vehicle Type', 'State', 'Registration Date', 'Created At'];
        const csvData = results.map(plate => [
          plate.plate_number,
          plate.owner_name,
          plate.vehicle_type,
          plate.state,
          new Date(plate.registration_date).toLocaleDateString(),
          new Date(plate.created_at).toLocaleDateString()
        ]);

        const csvContent = [headers, ...csvData]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=nigerian-plates.csv');
        res.send(csvContent);
      });
    } catch (error) {
      console.error("Export CSV error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
};