const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

const authController = {
    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;
            let user = await User.findOne({ email });

            if (user) {
                return res.status(400).json({ message: 'User already exists' });
            }

            user = await User.create({ name, email, password });
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: '1d'
            });

            res.status(201).json({ token });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },


    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });

            if (!user) return res.status(401).json({ message: 'Invalid credentials' });
            if (user.isLocked) return res.status(423).json({ message: 'Account is locked' });

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                await user.incLoginAttempts();
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // ✅ Update login details
            const clientIP = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            const deviceType = user.getDeviceType(userAgent);

            await user.updateOne({
                $unset: { lockUntil: 1 },
                $set: {
                    loginAttempts: 0,
                    lastLogin: new Date(),
                    lastLoginIP: clientIP,
                    lastLoginUserAgent: userAgent,
                    lastLoginDevice: deviceType
                },
                $inc: { loginCount: 1 }
            });

            // ✅ Create access + refresh tokens
            const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
            const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRE });

            // ✅ Set both as cookies
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

            // ✅ Response
            res.json({
                message: 'Login successful',
                user: {
                    id: user._id,
                    email: user.email,
                    lastLogin: user.lastLogin
                }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },







    forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user)
        return res.status(404).json({ message: "User not found" });

      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      const MAX_ATTEMPTS = 3;

      // ✅ Initialize tracking fields if missing
      if (!user.passwordResetAttempts || !user.firstPasswordResetAttempt) {
        user.passwordResetAttempts = 0;
        user.firstPasswordResetAttempt = now;
      }

      // ✅ If within 2 hours window
      if (now - user.firstPasswordResetAttempt < TWO_HOURS) {
        if (user.passwordResetAttempts >= MAX_ATTEMPTS) {
          return res.status(429).json({
            success: false,
            message: "Too many password reset attempts. Try again later."
          });
        }
      } else {
        // ⏳ Reset the window after 2 hours
        user.passwordResetAttempts = 0;
        user.firstPasswordResetAttempt = now;
      }

      // ✅ Increment attempts
      user.passwordResetAttempts += 1;

      // Generate token + OTP
      const token = crypto.randomBytes(32).toString("hex");
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
      user.resetPasswordExpires = now + 10 * 60 * 1000; // 10 min
      user.resetPasswordOTP = otp;
      user.resetPasswordOTPExpires = now + 5 * 60 * 1000; // 5 min

      await user.save();

      const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;
      const message = `
You requested a password reset.\n\n
🔗 Reset link: ${resetURL}\n
🔢 OTP: ${otp}\n
Both are valid for a few minutes.
`;

      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message
      });

      res.status(200).json({
        success: true,
        message: "Password reset instructions sent!"
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },









    resetPasswordWithToken: async (req, res) => {
        try {
            const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

            const user = await User.findOne({
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
            });

            if (!user) return res.status(400).json({ message: "Invalid or expired token" });

            user.password = req.body.password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.resetPasswordOTP = undefined;
            user.resetPasswordOTPExpires = undefined;
            await user.save();

            res.status(200).json({ success: true, message: "Password reset successful!" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    resetPasswordWithOTP: async (req, res) => {
        try {
            const { email, otp, password } = req.body;

            const user = await User.findOne({
                email,
                resetPasswordOTP: otp,
                resetPasswordOTPExpires: { $gt: Date.now() },
            });

            if (!user) {
                return res.status(400).json({ message: "Invalid or expired OTP" });
            }

            user.password = password;
            user.resetPasswordOTP = undefined;
            user.resetPasswordOTPExpires = undefined;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.status(200).json({ success: true, message: "Password reset successful via OTP!" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getMe: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpire');
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getLastLoginDetails: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('lastLogin lastLoginIP lastLoginDevice lastFailedLogin loginCount');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const loginDetails = {
                lastLogin: user.lastLogin,
                lastLoginIP: user.lastLoginIP,
                lastLoginDevice: user.lastLoginDevice,
                lastFailedLogin: user.lastFailedLogin,
                totalLogins: user.loginCount
            };

            res.json(loginDetails);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    // ✅ Check login status (for Redux memory auth)
    checkAuth: async (req, res) => {
        try {
            // Check if token cookie exists
            const token = req.cookies.token;
            if (!token) {
                return res.status(200).json({ loggedIn: false });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password'); // exclude password

            if (!user) {
                return res.status(200).json({ loggedIn: false });
            }

            res.status(200).json({
                loggedIn: true,
                user
            });
        } catch (error) {
            res.status(200).json({ loggedIn: false });
        }
    },
    logout: async (req, res) => {
        try {
            res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
            res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
            return res.status(200).json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
    },

    refreshToken: async (req, res) => {
        try {
            const token = req.cookies?.refreshToken;
            if (!token) return res.status(401).json({ message: 'No refresh token' });

            jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
                if (err) return res.status(403).json({ message: 'Invalid or expired refresh token' });

                const newAccessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRE || '15m'
                });

                res.cookie('token', newAccessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Lax',
                    maxAge: 15 * 60 * 1000 // 15 minutes
                });

                return res.json({ success: true, message: 'Access token refreshed' });
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },


};

module.exports = authController;
