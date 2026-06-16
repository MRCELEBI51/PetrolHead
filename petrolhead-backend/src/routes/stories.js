const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');

const Story = mongoose.models.Story || mongoose.model('Story', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  duration: { type: Number, default: 10 },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}));

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mediaUrl, mediaType, duration } = req.body;

    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newStory = new Story({
      userId: req.user._id,
      mediaUrl,
      mediaType,
      duration: duration || 10,
      expiresAt
    });

    await newStory.save();
    return res.status(201).json(newStory);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const targetUserIds = [...(currentUser.following || []), req.user._id];

    const activeStories = await Story.find({
      userId: { $in: targetUserIds },
      expiresAt: { $gt: new Date() }
    })
    .populate('userId', 'username profileImage')
    .sort({ createdAt: 1 });

    const groups = {};
    for (const story of activeStories) {
      if (!story.userId) continue;

      const author = story.userId;
      const authorIdStr = author._id.toString();

      if (!groups[authorIdStr]) {
        groups[authorIdStr] = {
          userId: author._id,
          username: author.username,
          profileImage: author.profileImage || '',
          stories: [],
          hasUnseenStory: false
        };
      }

      const hasViewed = (story.viewers || []).some(
        (viewerId) => viewerId.toString() === req.user._id.toString()
      );

      if (!hasViewed) {
        groups[authorIdStr].hasUnseenStory = true;
      }

      groups[authorIdStr].stories.push(story);
    }

    return res.status(200).json(Object.values(groups));
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/:id/view', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Hikaye bulunamadı.' });
    }

    await Story.findByIdAndUpdate(req.params.id, {
      $addToSet: { viewers: req.user._id }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Hikaye bulunamadı.' });
    }

    if (story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Bu hikayeyi silme yetkiniz yok.' });
    }

    await Story.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
