const User = require('../models/User');

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
            const { name, email } = req.body;
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { name, email },
                { new: true }
            ).select('-password');
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = userController;
