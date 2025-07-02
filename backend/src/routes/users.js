// src/routes/users.js
const express = require("express");
const { pool } = require("../utils/database");
const { authenticateToken } = require("../middleware/auth");
const { query, validationResult } = require("express-validator");

const router = express.Router();

// Search Users (for sending money)
router.get(
  "/search",
  authenticateToken,
  [
    query("query")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Search query must be at least 2 characters"),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      next();
    },
  ],
  async (req, res) => {
    try {
      const { query: searchQuery } = req.query;
      const userId = req.user.id;

      // Search by name, email, or phone (excluding current user)
      const result = await pool.query(
        `
      SELECT id, name, email, phone 
      FROM users 
      WHERE (
        name ILIKE $1 OR 
        email ILIKE $1 OR 
        phone ILIKE $1
      ) 
      AND id != $2 
      AND is_active = true
      LIMIT 10
    `,
        [`%${searchQuery}%`, userId]
      );

      const users = result.rows.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      }));

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search users",
      });
    }
  }
);

module.exports = router;
