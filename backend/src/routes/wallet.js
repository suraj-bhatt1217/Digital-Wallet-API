// src/routes/wallet.js
const express = require("express");
const { pool } = require("../utils/database");
const { client: redisClient } = require("../utils/redis");
const { authenticateToken } = require("../middleware/auth");
const {
  addMoneyValidation,
  sendMoneyValidation,
} = require("../middleware/validation");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Get Balance
router.get("/balance", authenticateToken, async (req, res) => {
  try {
    // Try to get balance from Redis cache first
    const cacheKey = `balance:${req.user.id}`;
    const cachedBalance = await redisClient.get(cacheKey);

    if (cachedBalance) {
      return res.json({
        success: true,
        data: {
          balance: parseFloat(cachedBalance),
          lastUpdated: new Date().toISOString(),
          cached: true,
        },
      });
    }

    // Get balance from database
    const result = await pool.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    const balance = parseFloat(result.rows[0].balance);

    // Cache balance for 5 minutes
    await redisClient.setEx(cacheKey, 300, balance.toString());

    res.json({
      success: true,
      data: {
        balance,
        lastUpdated: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Get balance error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch balance",
    });
  }
});

// Add Money
router.post(
  "/add-money",
  authenticateToken,
  addMoneyValidation,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { amount, paymentMethod } = req.body;
      const userId = req.user.id;
      const referenceId = `ADD_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await client.query("BEGIN");

      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (sender_id, amount, transaction_type, status, payment_method, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, amount, "add_money", "completed", paymentMethod, referenceId]
      );

      const transactionId = transactionResult.rows[0].id;

      // Update wallet balance
      const walletResult = await client.query(
        "UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING balance",
        [amount, userId]
      );

      const newBalance = parseFloat(walletResult.rows[0].balance);

      await client.query("COMMIT");

      // Clear balance cache
      await redisClient.del(`balance:${userId}`);

      res.json({
        success: true,
        message: "Money added successfully",
        data: {
          transactionId,
          amount: parseFloat(amount),
          newBalance,
          paymentMethod,
          referenceId,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Add money error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add money",
      });
    } finally {
      client.release();
    }
  }
);

// Send Money
router.post(
  "/send-money",
  authenticateToken,
  sendMoneyValidation,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { recipientId, amount, note } = req.body;
      const senderId = req.user.id;

      if (senderId === recipientId) {
        return res.status(400).json({
          success: false,
          message: "Cannot send money to yourself",
        });
      }

      await client.query("BEGIN");

      // Check sender's balance
      const senderWallet = await client.query(
        "SELECT balance FROM wallets WHERE user_id = $1",
        [senderId]
      );

      if (senderWallet.rows.length === 0) {
        throw new Error("Sender wallet not found");
      }

      const senderBalance = parseFloat(senderWallet.rows[0].balance);
      if (senderBalance < amount) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
        });
      }

      // Check if recipient exists
      const recipient = await client.query(
        "SELECT id, name, email FROM users WHERE id = $1 AND is_active = true",
        [recipientId]
      );

      if (recipient.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Recipient not found",
        });
      }

      const referenceId = `SEND_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create send transaction
      const sendTransactionResult = await client.query(
        `INSERT INTO transactions (sender_id, recipient_id, amount, transaction_type, status, note, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          senderId,
          recipientId,
          amount,
          "send_money",
          "completed",
          note,
          referenceId,
        ]
      );

      // Create receive transaction
      await client.query(
        `INSERT INTO transactions (sender_id, recipient_id, amount, transaction_type, status, note, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          senderId,
          recipientId,
          amount,
          "receive_money",
          "completed",
          note,
          referenceId,
        ]
      );

      // Update sender's balance
      const senderNewBalance = await client.query(
        "UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING balance",
        [amount, senderId]
      );

      // Update recipient's balance
      await client.query(
        "UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
        [amount, recipientId]
      );

      await client.query("COMMIT");

      // Clear both users' balance cache
      await Promise.all([
        redisClient.del(`balance:${senderId}`),
        redisClient.del(`balance:${recipientId}`),
      ]);

      res.json({
        success: true,
        message: "Money sent successfully",
        data: {
          transactionId: sendTransactionResult.rows[0].id,
          amount: parseFloat(amount),
          newBalance: parseFloat(senderNewBalance.rows[0].balance),
          recipient: {
            id: recipient.rows[0].id,
            name: recipient.rows[0].name,
            email: recipient.rows[0].email,
          },
          note,
          referenceId,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Send money error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send money",
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
