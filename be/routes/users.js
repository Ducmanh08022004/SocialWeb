const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { upload, checkFileSize } = require('../middlewares/upload');
const { getMyProfile, getProfileById, updateProfile, updateAvatar, updateCover, searchUsers } = require('../controllers/userController');

router.get('/me', auth, getMyProfile);
router.get('/search', auth, searchUsers);
router.get('/:userId', auth, getProfileById);
router.put('/me', auth, updateProfile);
router.post('/avatar', auth, upload.single('image'), checkFileSize, updateAvatar);
router.post('/cover', auth, upload.single('image'), checkFileSize, updateCover);

module.exports = router;
