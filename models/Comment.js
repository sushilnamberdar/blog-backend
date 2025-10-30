const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reports: [{ // 👈 New: users who reported this comment
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isHidden: { // 👈 New: comment hidden after multiple reports
    type: Boolean,
    default: false
  },
  isApproved: { // 👈 Auto-approved (freedom)
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
