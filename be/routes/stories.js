const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { createStory, getStories } = require('../controllers/storyController');

router.post('/', auth, upload.single('media'), createStory);
router.get('/', auth, getStories);

module.exports = router;
