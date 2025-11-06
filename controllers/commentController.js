const Comment = require('../models/Comment');

const commentController = {
  // ✅ Get all comments for a post (only non-hidden)
  // controllers/commentController.js

  getComments: async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const postId = req.params.postId;

        const skip = (page - 1) * limit;

        const rootComments = await Comment.find({ post: postId, parentComment: null, isApproved: true })
            .populate("user", "name avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRootComments = await Comment.countDocuments({ post: postId, parentComment: null, isApproved: true });

        const commentsWithReplies = await Promise.all(rootComments.map(async (comment) => {
            const replies = await Comment.find({ parentComment: comment._id, isApproved: true }).populate('user', 'name avatar');
            return { ...comment.toObject(), replies };
        }));

        res.json({
            comments: commentsWithReplies,
            totalPages: Math.ceil(totalRootComments / limit),
            currentPage: parseInt(page),
            totalComments: totalRootComments
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  },

  // ✅ Create new comment (auto-approved)
  createComment: async (req, res) => {
    try {
      const { content, parentComment } = req.body;

      const comment = await Comment.create({
        content,
        post: req.params.postId,
        user: req.user.id,
        parentComment: parentComment || null
      });

      await comment.populate('user', 'name');
      res.status(201).json({
        success: true,
        comment,
        message: 'Comment posted successfully!'
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ Like or unlike a comment
  toggleLike: async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      const userId = req.user.id;
      const alreadyLiked = comment.likes.includes(userId);

      if (alreadyLiked) {
        comment.likes.pull(userId);
        await comment.save();
        return res.json({ message: 'Like removed' });
      } else {
        comment.likes.push(userId);
        await comment.save();
        return res.json({ message: 'Comment liked' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ Report a comment (community moderation)
  reportComment: async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      const userId = req.user.id;

      // Prevent multiple reports by same user
      if (comment.reports.includes(userId)) {
        return res.status(400).json({ message: 'You already reported this comment' });
      }

      comment.reports.push(userId);

      // If 3+ reports → automatically hide it
      if (comment.reports.length >= 3) {
        comment.isHidden = true;
      }

      await comment.save();
      res.json({
        message: comment.isHidden
          ? 'Comment hidden due to multiple reports'
          : 'Comment reported successfully'
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ Update comment
  updateComment: async (req, res) => {
    try {
      const { content } = req.body;
      const comment = await Comment.findByIdAndUpdate(
        req.params.id,
        { content },
        { new: true }
      ).populate('user', 'name');

      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ Delete comment
  deleteComment: async (req, res) => {
    try {
      const comment = await Comment.findByIdAndDelete(req.params.id);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  replyToComment: async (req, res) => {
    try {
      const { content } = req.body;

      const parentComment = await Comment.findById(req.params.commentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }

      const reply = await Comment.create({
        post: parentComment.post,
        user: req.user.id,
        content,
        parentComment: parentComment._id,
      });

      await reply.populate('user', 'name');
      res.status(201).json({ reply, message: 'Reply added successfully!' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  toggleLike: async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }

      const userId = req.user.id;
      const index = comment.likes.indexOf(userId);

      if (index === -1) {
        comment.likes.push(userId);
        await comment.save();
        return res.json({ message: 'Liked the comment' });
      } else {
        comment.likes.splice(index, 1);
        await comment.save();
        return res.json({ message: 'Unliked the comment' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

};

module.exports = commentController;
