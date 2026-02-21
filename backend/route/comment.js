const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// 1. Dodavanje komentara na prodavnicu
router.post('/add', commentController.addComment);

// 2. Brisanje komentara putem ID-a veze
router.delete('/delete/:id', commentController.deleteComment);

// 3. Izmena teksta komentara
router.put('/update', commentController.updateComment);

// 4. Dobijanje svih komentara za određenu prodavnicu
router.get('/store/:storeId', commentController.getStoreComments);

module.exports = router;