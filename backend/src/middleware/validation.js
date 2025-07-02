// src/middleware/validation.js
const { body, query, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("phone")
    .isMobilePhone("en-IN")
    .withMessage("Invalid Indian phone number"),
  handleValidationErrors,
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const addMoneyValidation = [
  body("amount")
    .isFloat({ min: 1, max: 100000 })
    .withMessage("Amount must be between ₹1 and ₹100,000"),
  body("paymentMethod")
    .isIn(["UPI", "Card", "Net Banking"])
    .withMessage("Invalid payment method"),
  handleValidationErrors,
];

const sendMoneyValidation = [
  body("recipientId").isUUID().withMessage("Invalid recipient ID"),
  body("amount")
    .isFloat({ min: 1, max: 50000 })
    .withMessage("Amount must be between ₹1 and ₹50,000"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Note too long"),
  handleValidationErrors,
];

const transactionQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("type")
    .optional()
    .isIn(["sent", "received", "add_money"])
    .withMessage("Invalid transaction type"),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  addMoneyValidation,
  sendMoneyValidation,
  transactionQueryValidation,
};
