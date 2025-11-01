const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { auth } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

// Single image upload
router.post('/image', auth, upload.single('image'), uploadController.uploadImage);

// Multiple images upload (optional)
router.post('/images', auth, upload.array('images', 5), uploadController.uploadMultipleImages);

module.exports = router;
