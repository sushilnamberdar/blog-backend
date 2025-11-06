const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const autoCleanImages = require('./config/autoCleanImages');
const multer = require('multer');
const MongoStore = require('rate-limit-mongo');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const session = require('express-session');
const passport = require('passport');
require('./config/passport')(passport);

// Load environment variables
dotenv.config();
const app = express();

// Passport and Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());



// global  Middleware
app.use(require('cookie-parser')());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(express.json({ limit: '10mb' }));

// ------------------------
// 🧠 Rate Limiting (Environment-based)
// ------------------------
let limiter;

if (process.env.NODE_ENV === 'production') {
    console.log('🧩 Using MongoDB-based rate limiter');
    const MongoStore = require('rate-limit-mongo');

    limiter = rateLimit({
        store: new MongoStore({
            uri: process.env.MONGODB_URI,
            collectionName: 'rateLimits',
            expireTimeMs: 15 * 60 * 1000, // 15 minutes TTL
        }),
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: {
            success: false,
            message: 'Too many requests. Please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
} else {
    console.log('🧪 Using in-memory rate limiter (development)');
    limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        message: {
            success: false,
            message: 'Too many requests. Please try again later.',
        },
    });
}

app.use('/api/', limiter);


app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));










// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);


// multer error handler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum allowed size is 5 MB.',
        });
    }

    if (err.message === 'Only JPEG, PNG, and WEBP images are allowed!') {
        return res.status(400).json({ success: false, message: err.message });
    }

    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
});

// fall back Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});



// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');

        // 🧹 Start auto-cleanup job every 3 hours
        autoCleanImages();
    })
    .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});