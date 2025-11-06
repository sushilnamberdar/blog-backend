const Comment = require('../models/Comment');
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

const commentController = {
  getComments: async (req, res) => {
    try {
      const { postId } = req.params;
      if (!postId || postId.length !== 24) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const comments = await Comment.find({ post: postId, parentComment: null, isApproved: true })
        .populate("user", "_id name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalComments = await Comment.countDocuments({
        post: postId,
        parentComment: null,
        isApproved: true,
      });

      const populateReplies = async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id, isApproved: true })
          .populate("user", "_id name avatar")
          .sort({ createdAt: 1 })
          .lean();

        for (let reply of replies) {
          reply.createdAtFormatted = dayjs(reply.createdAt).fromNow();
          reply.replyCount = await Comment.countDocuments({ parentComment: reply._id });
          reply.replies = await populateReplies(reply);
        }
        return replies;
      };

      const populatedComments = await Promise.all(
        comments.map(async (comment) => {
          comment.replyCount = await Comment.countDocuments({ parentComment: comment._id });
          comment.createdAtFormatted = dayjs(comment.createdAt).fromNow();
          if (req.user) {
            comment.isOwner = comment.user._id.toString() === req.user._id.toString();
            comment.canEdit = comment.isOwner || req.user.role === "admin";
          } else {
            comment.isOwner = false;
            comment.canEdit = false;
          }
          comment.replies = await populateReplies(comment);
          return comment;
        })
      );


      const normalizeMongoDoc = (doc) => {
        if (Array.isArray(doc)) return doc.map(normalizeMongoDoc);
        if (doc && typeof doc === "object") {
          const { _id, __v, ...rest } = doc;
          return { id: _id?.toString(), ...rest };
        }
        return doc;
      };



      return res.status(200).json({
        comments: normalizeMongoDoc(populatedComments),
        pagination: {
          totalComments,
          totalPages: Math.ceil(totalComments / limit),
          currentPage: page,
        },
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
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
