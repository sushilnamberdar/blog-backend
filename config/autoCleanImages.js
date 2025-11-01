const { v2: cloudinary } = require('cloudinary');
const cron = require('node-cron');
const Post = require('../models/Post'); // adjust path as needed
require('dotenv').config();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Function to clean unused images
const cleanUnusedImages = async () => {
  try {
    console.log('🧹 Starting Cloudinary cleanup...');

    // 1️⃣ Get all images used in posts (from DB)
    const posts = await Post.find({}, 'images');
    const usedImageURLs = new Set(posts.flatMap(post => post.images));

    // 2️⃣ Get all images in Cloudinary folder
    const cloudImages = await cloudinary.api.resources({
      type: 'upload',
      prefix: process.env.CLOUDINARY_FOLDER || 'post_images/', // Folder name in Cloudinary
      max_results: 500,
      // Include creation date to filter by time
      resource_type: 'image',
    }); 

    let deletedCount = 0;
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    // 3️⃣ Check which ones are not in DB and older than 3 hours, then delete
    for (const image of cloudImages.resources) {
      const uploadedDate = new Date(image.created_at);
      if (uploadedDate < threeHoursAgo && !usedImageURLs.has(image.secure_url)) {
        await cloudinary.uploader.destroy(image.public_id);
        console.log(`🗑️ Deleted unused image: ${image.public_id} (uploaded at ${image.created_at})`);
        deletedCount++;
      }
    }

    console.log(`✅ Cleanup complete. Deleted ${deletedCount} unused images.`);
  } catch (error) {
    console.error('❌ Error during Cloudinary cleanup:', error);
  }
};

// 4️⃣ Schedule job every 3 hours
cron.schedule('0 */3 * * *', () => {
  cleanUnusedImages();
});

module.exports = cleanUnusedImages;
