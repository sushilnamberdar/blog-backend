const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin, validateForgotPassword, validateResetPasswordWithOTP, validateResetPasswordWithToken } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { forgotPasswordLimiter } = require('../middleware/rateLimiter');
const passport = require('passport');
const jwt = require('jsonwebtoken');

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
router.get('/refresh', authController.refreshToken);


// / Start Google Login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const user = req.user;
        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRE });

        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 15 * 60 * 1000 // 15 min
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect back to frontend
        const redirectURL = `${process.env.CLIENT_URL}/login/success`;
        res.redirect(redirectURL);
    }
);


module.exports = router;
