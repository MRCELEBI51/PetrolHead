const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');

const Topic = mongoose.models.Topic || mongoose.model('Topic', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  vehicle: {
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: String, default: '' }
  },
  images: [{ type: String }],
  category: { type: String, default: 'Technical' },
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    upvotes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    downvotes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    createdAt: { type: Date, default: Date.now }
  }],
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}));

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const topics = await Topic.find()
      .populate('userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json(topics);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!topic) {
      return res.status(404).json({ error: 'Konu bulunamadı.' });
    }

    await topic.populate([
      { path: 'userId', select: 'username profileImage' },
      { path: 'comments.userId', select: 'username profileImage' }
    ]);

    return res.status(200).json(topic);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, body, vehicle, images, category } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    const newTopic = new Topic({
      userId: req.user._id,
      title,
      body,
      vehicle: vehicle || {},
      images: images || [],
      category: category || 'Technical'
    });

    await newTopic.save();

    return res.status(201).json(newTopic);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Yorum boş olamaz.' });
    }

    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ error: 'Konu bulunamadı.' });
    }

    topic.comments.push({
      userId: req.user._id,
      text: comment
    });

    await topic.save();

    return res.status(201).json(topic);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/:id/comments/:commentId/vote', authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ error: 'Konu bulunamadı.' });
    }

    const comment = topic.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı.' });
    }

    const userIdStr = req.user._id.toString();

    if (!comment.upvotes) comment.upvotes = [];
    if (!comment.downvotes) comment.downvotes = [];

    if (type === 'up') {
      const downIdx = comment.downvotes.findIndex(id => id.toString() === userIdStr);
      if (downIdx > -1) comment.downvotes.splice(downIdx, 1);

      const upIdx = comment.upvotes.findIndex(id => id.toString() === userIdStr);
      if (upIdx > -1) {
        comment.upvotes.splice(upIdx, 1);
      } else {
        comment.upvotes.push(req.user._id);
      }
    } else if (type === 'down') {
      const upIdx = comment.upvotes.findIndex(id => id.toString() === userIdStr);
      if (upIdx > -1) comment.upvotes.splice(upIdx, 1);

      const downIdx = comment.downvotes.findIndex(id => id.toString() === userIdStr);
      if (downIdx > -1) {
        comment.downvotes.splice(downIdx, 1);
      } else {
        comment.downvotes.push(req.user._id);
      }
    }

    await topic.save();

    await topic.populate([
      { path: 'userId', select: 'username profileImage' },
      { path: 'comments.userId', select: 'username profileImage' }
    ]);

    return res.status(200).json(topic);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
