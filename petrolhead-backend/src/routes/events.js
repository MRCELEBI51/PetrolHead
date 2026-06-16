const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');

const Event = mongoose.models.Event || mongoose.model('Event', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'Cars & Coffee' },
  image: { type: String },
  capacity: { type: Number, default: 500 },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
}));

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const events = await Event.find()
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json(events);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('userId', 'username profileImage')
      .populate('attendees', 'username profileImage');

    if (!event) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı.' });
    }

    return res.status(200).json(event);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, location, date, description, category, image, capacity } = req.body;

    if (!title || !location || !date || !description) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    const newEvent = new Event({
      userId: req.user._id,
      title,
      location,
      date,
      description,
      category: category || 'Cars & Coffee',
      image: image || '',
      capacity: capacity ? parseInt(capacity) : 500
    });

    await newEvent.save();

    return res.status(201).json(newEvent);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı.' });
    }

    const userIdStr = req.user._id.toString();
    const attendeeIndex = event.attendees.findIndex(id => id.toString() === userIdStr);

    if (attendeeIndex > -1) {
      event.attendees.splice(attendeeIndex, 1);
    } else {
      event.attendees.push(req.user._id);
    }

    await event.save();

    return res.status(200).json(event);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
