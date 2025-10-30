const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { auth, authorize } = require('../middleware/auth');
const { validatePost } = require('../middleware/validation');
const { route } = require('./adminRoutes');

/**
 * 🧾 PUBLIC ROUTES
 */
router.get('/search', postController.searchPosts);
router.get('/', postController.getPosts);

router.get('/my-posts', auth, authorize('author'), postController.getUserPosts);


router.get('/trash/all', auth, authorize('admin', 'author'), postController.getTrashedPosts);
router.get('/trash/mine', auth, authorize('author'), postController.getMyTrashedPosts);
router.get('/:id', postController.getPost);

/**
 * ✍️ AUTHOR + ADMIN ROUTES
 */
router.post('/', auth, authorize('admin', 'author'), validatePost, postController.createPost);
router.put('/:id', auth, authorize('admin', 'author'), validatePost, postController.updatePost);
router.put('/:id/like', auth, postController.toggleLike);

/**
 * 🗑️ SOFT DELETE / RESTORE (TRASH SYSTEM)
 */
router.delete('/:id', auth, authorize('admin', 'author'), postController.softDeletePost);
router.put('/:id/restore', auth, authorize('author'), postController.restorePost);

/**
 * 💀 PERMANENT DELETE OPTIONS
 */
// When a *user* permanently deletes → transfer ownership to “Anonymous”
router.delete('/:id/user-permanent', auth, authorize('author'), postController.userPermanentDeletePost);

// When *admin* permanently deletes → remove completely from DB
router.delete('/:id/admin-permanent', auth, authorize('admin'), postController.adminPermanentDeletePost);

module.exports = router;
