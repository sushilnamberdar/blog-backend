const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { auth } = require('../middleware/auth');
const { validateComment } = require('../middleware/validation');

/**
 * 🗨️ Comment Routes
 */

// 📌 Get all comments for a post (public)
router.get('/post/:postId', commentController.getComments);

// ✍️ Create new comment (auth required)
router.post('/post/:postId', auth, validateComment, commentController.createComment);

// ✏️ Update a comment (auth required)
router.put('/:id', auth, validateComment, commentController.updateComment);

// ❌ Delete a comment (auth required)
router.delete('/:id', auth, commentController.deleteComment);

// 💬 Reply to a comment (auth required)
router.post('/:commentId/reply', auth, validateComment, commentController.replyToComment);

// ❤️ Toggle like/unlike on a comment (auth required)
router.put('/:commentId/like', auth, commentController.toggleLike);

module.exports = router;
