const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

router.post('/add', discountController.addDiscount);
router.put('/update', discountController.updateDiscount);
router.post('/remove', discountController.removeDiscount);

module.exports = router;