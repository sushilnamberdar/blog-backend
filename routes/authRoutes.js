const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin,validateForgotPassword,validateResetPasswordWithOTP,validateResetPasswordWithToken } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { forgotPasswordLimiter } = require('../middleware/rateLimiter');

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/forget-password', forgotPasswordLimiter, validateForgotPassword, authController.forgotPassword);
router.post('/reset-password/:token', validateResetPasswordWithToken, authController.resetPasswordWithToken);
router.post('/reset-password-otp', validateResetPasswordWithOTP, authController.resetPasswordWithOTP);
router.get('/me', auth, authController.getMe);
router.get('/logout', authController.logout);
// router.post('/refresh-token', authController.refreshToken);
router.get('/check', authController.checkAuth);
router.get('/last-login-details', auth, authController.getLastLoginDetails);
router.get('/refresh',authController.refreshToken);
module.exports = router;
