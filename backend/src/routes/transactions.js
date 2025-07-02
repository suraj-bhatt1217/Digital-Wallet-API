// src/routes/transactions.js
const express = require("express");
const { pool } = require("../utils/database");
const { authenticateToken } = require("../middleware/auth");
const { transactionQueryValidation } = require("../middleware/validation");

const router = express.Router();

// Get Transactions
router.get(
  "/",
  authenticateToken,
  transactionQueryValidation,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const type = req.query.type;
      const offset = (page - 1) * limit;

      let whereClause = "(t.sender_id = $1 OR t.recipient_id = $1)";
      let queryParams = [userId];

      if (type) {
        if (type === "sent") {
          whereClause +=
            " AND t.sender_id = $1 AND t.transaction_type IN ($2, $3)";
          queryParams.push("send_money", "add_money");
        } else if (type === "received") {
          whereClause += " AND t.recipient_id = $1 AND t.transaction_type = $2";
          queryParams.push("receive_money");
        } else if (type === "add_money") {
          whereClause += " AND t.sender_id = $1 AND t.transaction_type = $2";
          queryParams.push("add_money");
        }
      }

      // Get transactions with user details
      const transactionsQuery = `
      SELECT 
        t.id,
        t.amount,
        t.transaction_type,
        t.status,
        t.payment_method,
        t.note,
        t.reference_id,
        t.created_at,
        sender.name as sender_name,
        sender.email as sender_email,
        recipient.name as recipient_name,
        recipient.email as recipient_email
      FROM transactions t
      LEFT JOIN users sender ON t.sender_id = sender.id
      LEFT JOIN users recipient ON t.recipient_id = recipient.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

      queryParams.push(limit, offset);

      const transactionsResult = await pool.query(
        transactionsQuery,
        queryParams
      );

      // Get total count for pagination
      const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE ${whereClause}
    `;

      const countResult = await pool.query(
        countQuery,
        queryParams.slice(0, -2)
      );
      const total = parseInt(countResult.rows[0].total);

      // Format transactions
      const transactions = transactionsResult.rows.map((tx) => {
        return {
          id: tx.id,
          type: tx.transaction_type,
          amount: parseFloat(tx.amount),
          status: tx.status,
          paymentMethod: tx.payment_method,
          note: tx.note,
          referenceId: tx.reference_id,
          createdAt: tx.created_at,
          ...(tx.transaction_type === "send_money" && {
            recipient: {
              name: tx.recipient_name,
              email: tx.recipient_email,
            },
          }),
          ...(tx.transaction_type === "receive_money" && {
            sender: {
              name: tx.sender_name,
              email: tx.sender_email,
            },
          }),
        };
      });

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch transactions",
      });
    }
  }
);

// Get Transaction by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        t.id,
        t.amount,
        t.transaction_type,
        t.status,
        t.payment_method,
        t.note,
        t.reference_id,
        t.created_at,
        sender.name as sender_name,
        sender.email as sender_email,
        recipient.name as recipient_name,
        recipient.email as recipient_email
      FROM transactions t
      LEFT JOIN users sender ON t.sender_id = sender.id
      LEFT JOIN users recipient ON t.recipient_id = recipient.id
      WHERE t.id = $1 AND (t.sender_id = $2 OR t.recipient_id = $2)
    `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const tx = result.rows[0];

    const transaction = {
      id: tx.id,
      type: tx.transaction_type,
      amount: parseFloat(tx.amount),
      status: tx.status,
      paymentMethod: tx.payment_method,
      note: tx.note,
      referenceId: tx.reference_id,
      createdAt: tx.created_at,
      ...(tx.transaction_type === "send_money" && {
        recipient: {
          name: tx.recipient_name,
          email: tx.recipient_email,
        },
      }),
      ...(tx.transaction_type === "receive_money" && {
        sender: {
          name: tx.sender_name,
          email: tx.sender_email,
        },
      }),
    };

    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transaction",
    });
  }
});

module.exports = router;
