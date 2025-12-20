const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const {upload,checkFileSize }= require('../middlewares/upload');
const { createPost, getPost, listPosts, deletePost, getPostComments, likePost, unlikePost, updatePost } = require('../controllers/postController');

router.post('/', auth, upload.array('media', 10), checkFileSize, createPost);
router.get('/', auth, listPosts);
router.post('/:id/like', auth, likePost);
router.delete('/:id/like', auth, unlikePost);
router.get('/:id/comments', getPostComments);
router.get('/:id', getPost);
router.put('/:id', auth, updatePost);
router.delete('/:id', auth, deletePost);

module.exports = router;
