const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const targetId = req.params.id;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetId.toString()) {
      return res.status(400).json({ error: 'Kendinizi takip edemezsiniz.' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const currentUserIdStr = currentUserId.toString();
    const isFollowing = (targetUser.followers || []).some(id => id.toString() === currentUserIdStr);

    if (isFollowing) {
      await User.findByIdAndUpdate(targetId, { $pull: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: new mongoose.Types.ObjectId(targetId) } });
      const updatedTargetUser = await User.findById(targetId);
      return res.status(200).json({
        following: false,
        followersCount: (updatedTargetUser.followers || []).length
      });
    } else {
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: currentUserId } });
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: new mongoose.Types.ObjectId(targetId) } });
      const updatedTargetUser = await User.findById(targetId);
      return res.status(200).json({
        following: true,
        followersCount: (updatedTargetUser.followers || []).length
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query || !query.trim()) {
      return res.status(200).json([]);
    }
    const User = mongoose.model('User');
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    }, '_id username fullName profileImage bio');
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const Post = mongoose.model('Post');
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const postsCount = await Post.countDocuments({ userId: req.params.id });

    return res.status(200).json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName || '',
      bio: user.bio || '',
      profileImage: user.profileImage || '',
      followersCount: (user.followers || []).length,
      followingCount: (user.following || []).length,
      postsCount
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/:id/followers', async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.params.id).populate('followers', '_id username profileImage');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const followersList = (user.followers || []).map(f => ({
      _id: f._id,
      username: f.username,
      profileImage: f.profileImage || ''
    }));

    return res.status(200).json(followersList);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/:id/following', async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.params.id).populate('following', '_id username profileImage');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const followingList = (user.following || []).map(f => ({
      _id: f._id,
      username: f.username,
      profileImage: f.profileImage || ''
    }));

    return res.status(200).json(followingList);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
