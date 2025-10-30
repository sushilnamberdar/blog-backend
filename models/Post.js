const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    tags: [{ type: String }],
    coverImage: String,
    status: { type: String, enum: ['draft','under_review', 'published'], default: 'draft' },

    contentBlocks: [
        {
            type: { type: String, enum: ['text', 'image', 'heading'], required: true },
            value: { type: String, required: true }
        }
    ],

    viewsCount: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // 🗑️ Soft delete flags
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ♻️ Restore tracking
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    restoredAt: { type: Date, default: null },

    // 👤 Permanent user-delete -> move to anonymous user
    isUserDeletedPermanently: { type: Boolean, default: false },
    originalAuthor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
