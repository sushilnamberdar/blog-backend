// controllers/adminController.js
const Post = require('../models/Post');

exports.restorePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Restore the post
        post.isDeleted = false;
        post.deletedAt = null;
        post.deletedBy = null;
        post.restoredBy = req.user._id;
        post.restoredAt = new Date();

        // Put post in under_review before republishing
        post.status = 'under_review';

        await post.save();

        res.json({
            success: true,
            message: 'Post restored and marked as under_review',
            post,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 🧩 Admin republish post with ownership choice
exports.republishPost = async (req, res) => {
    try {
        const { giveBackOwnership } = req.body; // true/false
        const post = await Post.findById(req.params.id);

        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (giveBackOwnership && post.originalAuthor) {
            post.author = post.originalAuthor;
            post.originalAuthor = null;
        }

        post.status = 'published';
        await post.save();

        res.json({
            success: true,
            message: giveBackOwnership
                ? 'Post republished and ownership restored to original author'
                : 'Post republished under anonymous ownership',
            post
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



exports.getUnderReviewPosts = async (req, res) => {
    try {
        const posts = await Post.find({ status: 'under_review' })
            .populate('author', 'name email')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            total: posts.length,
            posts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching under review posts',
            error: error.message,
        });
    }
};