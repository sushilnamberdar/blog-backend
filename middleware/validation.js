const { body, validationResult } = require('express-validator');

// ✅ Reusable function to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ✅ Registration validation
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase, one uppercase, and one number'),
  handleValidationErrors
];

// ✅ Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// ✅ Post validation

const validatePost = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  // ✅ Replace "content" validation with "contentBlocks"
  body('contentBlocks')
    .isArray({ min: 1 })
    .withMessage('Content blocks are required')
    .custom((blocks) => {
      if (!blocks.every(block => block.type && block.value)) {
        throw new Error('Each content block must have type and value');
      }
      return true;
    }),

  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),

  body('coverImage')
    .optional()
    .isURL()
    .withMessage('Cover image must be a valid URL'),

  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published')
];


// ✅ Comment validation
const validateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  handleValidationErrors
];

const validateRepublish = (req, res, next) => {
  const { giveBackOwnership } = req.body;

  // Validate that `giveBackOwnership` is provided and boolean
  if (typeof giveBackOwnership !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: '`giveBackOwnership` field is required and must be a boolean (true/false)',
    });
  }

  next();
};


// ✅ Forgot password validation
const validateForgotPassword = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required"),
  handleValidationErrors,
];

// ✅ Reset with token validation
const validateResetPasswordWithToken = [
  body("password")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  handleValidationErrors,
];

// ✅ Reset with OTP validation
const validateResetPasswordWithOTP = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("Valid 6-digit OTP is required"),
  body("password")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  handleValidationErrors,
];


module.exports = {
  validateRegistration,
  validateLogin,
  validatePost,
  validateComment,
  validateRepublish,
  validateForgotPassword,
  validateResetPasswordWithToken,
  validateResetPasswordWithOTP

};
