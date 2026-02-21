const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.post('/create', categoryController.createCategory);
router.get('/all', categoryController.getAllCategories);
router.put('/update', categoryController.updateCategory);
router.delete('/delete/:name', categoryController.deleteCategory);

module.exports = router;