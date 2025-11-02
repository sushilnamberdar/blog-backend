const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

const userController = {
    getProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password');
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const { name, bio, email } = req.body;
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { name, email , bio },
                { new: true }
            ).select('-password');
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateAvatar: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No avatar file uploaded.' });
            }

            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // If user has an existing avatar, delete it from Cloudinary
            if (user.avatar) {
                const publicId = user.avatar.split('/').pop().split('.')[0];
                // Assuming the public ID is the last part of the URL before the extension
                // For example: https://res.cloudinary.com/your_cloud_name/image/upload/v12345/user_avatars/abcdefg.jpg
                // publicId would be 'user_avatars/abcdefg'
                const folder = process.env.CLOUDINARY_AVATAR_FOLDER || 'user_avatars';
                const fullPublicId = `${folder}/${publicId}`;
                
                try {
                    await cloudinary.uploader.destroy(fullPublicId);
                    console.log('Old avatar deleted from Cloudinary:', fullPublicId);
                } catch (deleteError) {
                    console.error('Error deleting old avatar from Cloudinary:', deleteError);
                    // Continue with updating the new avatar even if old one fails to delete
                }
            }

            // Update user with new avatar
            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { avatar: req.file.path },
                { new: true }
            ).select('-password');

            res.status(200).json({ message: 'Avatar updated successfully', user: updatedUser });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateUserRole: async (req, res) => {
        try {
            const { role } = req.body;

            // a user can change their own role to 'reader' or 'author', but not to 'admin'.
            if (role === 'admin') {
                return res.status(403).json({ message: 'You are not authorized to change your role to admin.' });
            }

            // Optional: Add validation to ensure the role is one of the allowed values
            if (!['reader', 'author'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role specified.' });
            }

            const user = await User.findByIdAndUpdate(
                req.user.id,
                { role },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            res.json({ message: 'User role updated successfully.', user });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = userController;
