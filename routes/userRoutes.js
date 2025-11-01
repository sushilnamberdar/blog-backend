const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const { upload, avatarUpload } = require('../middleware/upload');

// Placeholder routes - implement as needed
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/profile/avatar', auth, (req, res, next) => {
    avatarUpload(req, res, function (err) {
        if (err) {
            // Multer error or custom error from fileFilter
            if (err.message === 'Only JPEG, PNG, and WEBP images are allowed for avatars!') {
                return res.status(400).json({ message: err.message });
            }
            // For other errors, pass them to the next error handler
            return next(err);
        }
        next(); // Continue to the controller if no error
    });
}, userController.updateAvatar);

module.exports = router;
