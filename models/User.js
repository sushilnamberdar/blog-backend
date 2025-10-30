const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['admin', 'author', 'reader', 'anonymous'],
        default: 'reader'
    },
    bio: {
        type: String,
        maxlength: 500
    },
    avatar: String,
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    lastLoginIP: String,
    lastLoginUserAgent: String,
    lastLoginDevice: String,
    loginCount: {
        type: Number,
        default: 0
    },
    lastFailedLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordOTP: { type: String },
    resetPasswordOTPExpires: { type: Date },
    lastPasswordResetRequest: { type: Date },
    passwordResetAttempts: { type: Number, default: 0 },
    firstPasswordResetAttempt: { type: Date },

}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.incLoginAttempts = function () {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1, lastFailedLogin: new Date() }
        });
    }
    const updates = { $inc: { loginAttempts: 1 }, $set: { lastFailedLogin: new Date() } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }
    return this.updateOne(updates);
};

userSchema.methods.getDeviceType = function (userAgent) {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        return 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        return 'Tablet';
    } else {
        return 'Desktop';
    }
};

userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = mongoose.model('User', userSchema);
