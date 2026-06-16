const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'posts',
    allowed_formats: ['jpg', 'png', 'jpeg']
  }
});

const upload = multer({ storage: storage });

const Post = mongoose.models.Post || mongoose.model('Post', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  description: { type: String, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    replies: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }]
  }],
  createdAt: { type: Date, default: Date.now }
}));

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('userId', 'username profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { imageUrl, description } = req.body;
    console.log('[POST /posts] Gelen istek:', { imageUrl: !!imageUrl, description, userId: req.user?._id });

    if (!imageUrl) {
      return res.status(400).json({ error: 'Lütfen bir fotoğraf seçin.' });
    }

    const newPost = new Post({
      userId: req.user._id,
      imageUrl,
      description: description || ''
    });

    await newPost.save();
    await newPost.populate('userId', 'username profileImage');

    return res.status(201).json(newPost);
  } catch (error) {
    console.log('[POST /posts] Hata:', error.message);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Paylaşım bulunamadı.' });
    }

    const userIdStr = req.user._id.toString();
    const likeIndex = post.likes.findIndex(id => id.toString() === userIdStr);

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();

    return res.status(200).json(post);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/upload', authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenemedi.' });
    }
    return res.status(200).json({ imageUrl: req.file.path });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('comments.userId', 'username profileImage')
      .populate('comments.replies.userId', 'username profileImage');
    if (!post) {
      return res.status(404).json({ error: 'Paylaşım bulunamadı.' });
    }
    return res.status(200).json(post.comments || []);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Yorum boş olamaz.' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Paylaşım bulunamadı.' });
    }

    post.comments.push({
      userId: req.user._id,
      text: text.trim()
    });

    await post.save();
    await post.populate('comments.userId', 'username profileImage');

    const newComment = post.comments[post.comments.length - 1];
    return res.status(201).json(newComment);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/:postId/comments/:commentId/replies', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Yorum boş olamaz.' });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Paylaşım bulunamadı.' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı.' });
    }

    comment.replies.push({
      userId: req.user._id,
      text: text.trim()
    });

    await post.save();
    await post.populate('comments.replies.userId', 'username profileImage');

    const updatedComment = post.comments.id(req.params.commentId);
    const newReply = updatedComment.replies[updatedComment.replies.length - 1];

    return res.status(201).json(newReply);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/:postId/comments/:commentId/replies', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate('comments.replies.userId', 'username profileImage');

    if (!post) {
      return res.status(404).json({ error: 'Paylaşım bulunamadı.' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı.' });
    }

    return res.status(200).json(comment.replies || []);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
