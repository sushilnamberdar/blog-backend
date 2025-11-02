const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { restorePost, republishPost, getUnderReviewPosts, updateUserRole } = require('../controllers/adminController');
const { validateRepublish } = require('../middleware/validation');
// Placeholder routes - implement as needed
router.get('/stats', auth, authorize('admin'), (req, res) => {
    res.json({ message: 'Admin stats' });
});
router.get('/posts/under-review', auth, authorize('admin'), getUnderReviewPosts);


router.put('/posts/:id/restore', auth, authorize('admin'),restorePost );
router.put('/posts/:id/republish', auth, authorize('admin'), validateRepublish, republishPost);
router.put('/users/role', auth, authorize('admin'), updateUserRole);

module.exports = router;
