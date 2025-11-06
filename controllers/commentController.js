// controllers/commentController.js
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const commentController = {
  // GET /comments/post/:postId
  getComments: async (req, res) => {
    try {
      const { postId } = req.params;
      if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
      const skip = (page - 1) * limit;

      const decorate = (c, reqUser) => {
        c.likes = Array.isArray(c.likes) ? c.likes : [];
        c.replies = Array.isArray(c.replies) ? c.replies : [];
        c.createdAtFormatted = dayjs(c.createdAt).fromNow();
        if (reqUser) {
          c.isOwner = c.user?._id?.toString?.() === reqUser._id?.toString?.();
          c.canEdit = c.isOwner || reqUser.role === 'admin';
        } else {
          c.isOwner = false;
          c.canEdit = false;
        }
        return c;
      };

      const populateReplies = async (parentId, reqUser) => {
        const replies = await Comment.find({
          parentComment: parentId,
          isApproved: true,
        })
          .populate('user', '_id name avatar')
          .sort({ createdAt: 1 })
          .lean();

        for (let i = 0; i < replies.length; i++) {
          const r = decorate(replies[i], reqUser); // ← use reqUser
          r.replyCount = await Comment.countDocuments({
            parentComment: r._id,
            isApproved: true,
          });
          r.replies = await populateReplies(r._id, reqUser);
          replies[i] = r;
        }
        return replies;
      };

      const topLevel = await Comment.find({
        post: postId,
        parentComment: null,
        isApproved: true,
      })
        .populate('user', '_id name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalComments = await Comment.countDocuments({
        post: postId,
        parentComment: null,
        isApproved: true,
      });

      const populatedComments = [];
      for (const c of topLevel) {
        const base = decorate(c, req.user);
        base.replyCount = await Comment.countDocuments({
          parentComment: base._id,
          isApproved: true,
        });
        base.replies = await populateReplies(base._id, req.user);
        populatedComments.push(base);
      }

      return res.status(200).json({
        success: true,
        comments: populatedComments, // `_id` kept
        pagination: {
          totalComments,
          totalPages: Math.max(Math.ceil(totalComments / limit), 1),
          currentPage: page,
          perPage: limit,
        },
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // POST /comments/post/:postId
  createComment: async (req, res) => {
    try {
      const { content, parentComment } = req.body;

      const comment = await Comment.create({
        content,
        post: req.params.postId,
        user: req.user.id,
        parentComment: parentComment || null,
      });

      await comment.populate('user', '_id name avatar');

      // Normalize arrays for frontend safety
      const doc = comment.toObject();
      doc.likes = Array.isArray(doc.likes) ? doc.likes : [];
      doc.replies = [];

      res.status(201).json({
        success: true,
        comment: doc,
        message: 'Comment posted successfully!',
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // PUT /comments/:id
  updateComment: async (req, res) => {
    try {
      const { content } = req.body;
      const comment = await Comment.findByIdAndUpdate(
        req.params.id,
        { content },
        { new: true }
      ).populate('user', '_id name avatar');

      if (!comment) return res.status(404).json({ message: 'Comment not found' });
      res.json({ success: true, comment });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // DELETE /comments/:id
  deleteComment: async (req, res) => {
    try {
      const comment = await Comment.findByIdAndDelete(req.params.id);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });
      res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // POST /comments/:commentId/reply
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

      await reply.populate('user', '_id name avatar');

      const doc = reply.toObject();
      doc.likes = Array.isArray(doc.likes) ? doc.likes : [];
      doc.replies = [];

      res.status(201).json({
        success: true,
        comment: doc, // same key as createComment
        message: 'Reply added successfully!',
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // PUT /comments/:commentId/like
  toggleLike: async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.commentId);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      const userId = req.user.id;
      const index = comment.likes.findIndex((id) => id.toString() === userId.toString());

      if (index === -1) {
        comment.likes.push(userId);
        await comment.save();
        return res.json({ success: true, message: 'Liked the comment' });
      } else {
        comment.likes.splice(index, 1);
        await comment.save();
        return res.json({ success: true, message: 'Unliked the comment' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Optional: reportComment unchanged
  reportComment: async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      const userId = req.user.id;
      if (comment.reports.includes(userId)) {
        return res.status(400).json({ message: 'You already reported this comment' });
      }

      comment.reports.push(userId);
      if (comment.reports.length >= 3) comment.isHidden = true;

      await comment.save();
      res.json({
        success: true,
        message: comment.isHidden
          ? 'Comment hidden due to multiple reports'
          : 'Comment reported successfully',
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = commentController;
