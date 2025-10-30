exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Cloudinary already returns the full image URL in req.file.path
    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: req.file.path,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    const urls = req.files.map(file => file.path);
    return res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      urls,
    });
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
