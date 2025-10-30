const Post = require('../models/Post');
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');


const postController = {
    // ✅ Get all published posts (for homepage/feed)
    getPosts: async (req, res) => {
        try {
            // Pagination params
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Only get published & non-deleted posts
            const query = {
                isDeleted: false,
                status: 'published'
            };

            // Fetch posts with pagination and sorting
            const posts = await Post.find(query)
                .populate('author', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Count total posts
            const totalPosts = await Post.countDocuments(query);

            // Send response
            res.status(200).json({
                success: true,
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts,
                results: posts.length,
                posts,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },


    // serach posts
    searchPosts: async (req, res) => {
        try {
            const search = req.query.q || '';
            const limit = parseInt(req.query.limit) || 10;
            const page = parseInt(req.query.page) || 1;
            const skip = (page - 1) * limit;

            if (!search.trim()) {
                return res.status(400).json({ success: false, message: "Search query is required." });
            }

            // 🔍 Build dynamic query
            const query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } },
                ]
            };

            // 🧠 Only apply isDeleted if it exists in schema
            if (Post.schema.path('isDeleted')) {
                query.isDeleted = false;
            }

            const posts = await Post.find(query)
                .populate('author', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const totalPosts = await Post.countDocuments(query);

            res.status(200).json({
                success: true,
                message: `Search results for "${search}"`,
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts,
                results: posts.length,
                posts,
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },





    createPost: async (req, res) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { title, content, category, tags, coverImage, status } = req.body;

            // ✅ Auto-generate slug
            const slug = slugify(title, { lower: true, strict: true });

            // ✅ Prevent duplicate slugs
            const existingPost = await Post.findOne({ slug });
            if (existingPost) {
                return res.status(400).json({ message: 'A post with this title already exists.' });
            }

            // ✅ Create new post
            const post = await Post.create({
                title,
                content,
                slug,
                category: category || 'Uncategorized',
                tags: tags || [],
                coverImage: coverImage || '',
                status: status || 'draft',
                author: req.user.id
            });

            // Populate author name
            await post.populate('author', 'name email');

            res.status(201).json({
                message: 'Post created successfully',
                post
            });
        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ message: error.message });
        }
    },


    getPost: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id)
                .populate('author', 'name email role');

            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            // 🚫 Prevent normal users from viewing deleted posts
            if (post.isDeleted && req.user?.role !== 'admin') {
                return res.status(403).json({ message: 'This post has been deleted' });
            }

            res.status(200).json({
                success: true,
                post
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updatePost: async (req, res) => {
        try {
            const { title, content, category, tags, coverImage, status } = req.body;

            // Find the post
            const post = await Post.findById(req.params.id);
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            // Check if the logged-in user is the author or admin
            if (req.user.role !== 'admin' && post.author.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this post' });
            }

            // Update only fields that exist in the body
            if (title) {
                post.title = title;
                post.slug = slugify(title, { lower: true, strict: true });
            }
            if (content) post.content = content;
            if (category) post.category = category;
            if (tags) post.tags = tags;
            if (coverImage) post.coverImage = coverImage;
            if (status) post.status = status;

            await post.save();
            await post.populate('author', 'name');

            res.status(200).json({
                message: 'Post updated successfully!',
                post
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getMyTrashedPosts: async (req, res) => {
        try {
            const trashedPosts = await Post.find({ isDeleted: true, author: req.user.id })
                .sort({ deletedAt: -1 });

            res.status(200).json({
                success: true,
                count: trashedPosts.length,
                trashedPosts
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },


    // 🗑️ Soft delete post (move to trash)
    softDeletePost: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);
            if (!post) return res.status(404).json({ message: 'Post not found' });

            post.isDeleted = true;
            post.deletedAt = new Date();
            await post.save();

            res.status(200).json({
                success: true,
                message: 'Post moved to trash successfully',
                post
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ♻️ Restore post from trash
    restorePost: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);
            if (!post || !post.isDeleted) {
                return res.status(404).json({ message: 'Post not found or not deleted' });
            }

            // Restore the post
            post.isDeleted = false;
            post.deletedAt = null;
            post.restoredBy = req.user.id;  // 👈 record who restored it
            post.restoredAt = new Date();   // 👈 record when restored
            await post.save();

            res.status(200).json({
                success: true,
                message: 'Post restored successfully',
                post
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },




    getTrashedPosts: async (req, res) => {
        try {
            const trashedPosts = await Post.find({ isDeleted: true }).sort({ deletedAt: -1 });

            if (trashedPosts.length === 0) {
                return res.status(200).json({ message: "Trash is empty." });
            }

            res.status(200).json({
                success: true,
                count: trashedPosts.length,
                trashedPosts
            });
        } catch (error) {
            console.error("Error fetching trashed posts:", error);
            res.status(500).json({ success: false, message: "Server error fetching trash." });
        }
    },



    // 🧹 User permanently deletes post (reassign to Anonymous)
    userPermanentDeletePost: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);
            if (!post) return res.status(404).json({ message: 'Post not found' });

            // Only author can do this
            if (post.author.toString() !== req.user.id)
                return res.status(403).json({ message: 'Only the author can permanently delete their post' });

            // If not deleted yet, force it to deleted first
            if (!post.isDeleted) {
                post.isDeleted = true;
                post.deletedAt = new Date();
            }

            // Find the anonymous user (create one if doesn’t exist)
            const User = require('../models/User');
            let anonymousUser = await User.findOne({ email: 'anonymous@system.local' });
            if (!anonymousUser) {
                anonymousUser = await User.create({
                    name: 'Anonymous',
                    email: 'anonymous@system.local',
                    password: 'temporary',
                    role: 'anonymous'
                });
            }

            // Keep record of original author
            post.originalAuthor = post.author;
            post.author = anonymousUser._id;
            post.isUserDeletedPermanently = true;
            await post.save();

            res.status(200).json({
                success: true,
                message: 'Post permanently deleted successfully.',
                post
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // 🧨 Admin permanently deletes from DB
    adminPermanentDeletePost: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);
            if (!post) return res.status(404).json({ message: 'Post not found' });

            if (req.user.role !== 'admin')
                return res.status(403).json({ message: 'Only admin can permanently delete posts' });

            await Post.findByIdAndDelete(req.params.id);
            res.status(200).json({ success: true, message: 'Post permanently deleted from database' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },


    // post that is published by the user 


    getUserPosts: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Get posts authored by the logged-in user (not deleted)
            const posts = await Post.find({
                author: req.user.id,
                isDeleted: false,
            })
                .populate('author', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const totalPosts = await Post.countDocuments({
                author: req.user.id,
                isDeleted: false,
            });

            res.status(200).json({
                success: true,
                message: `Posts by ${req.user.name}`,
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts,
                results: posts.length,
                posts,
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },


    // Toggle like/unlike for a post
    toggleLike: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);

            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            const userId = req.user.id;
            const alreadyLiked = post.likes.includes(userId);

            if (alreadyLiked) {
                // Unlike (remove user ID)
                post.likes = post.likes.filter(id => id.toString() !== userId);
                await post.save();
                return res.status(200).json({
                    success: true,
                    message: 'You unliked this post',
                    totalLikes: post.likes.length
                });
            } else {
                // Like (add user ID)
                post.likes.push(userId);
                await post.save();
                return res.status(200).json({
                    success: true,
                    message: 'You liked this post!',
                    totalLikes: post.likes.length
                });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

};

module.exports = postController;
