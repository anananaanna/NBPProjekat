const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

router.post('/add', discountController.addDiscount);
router.get('/store/:storeName', discountController.getStoreDiscounts);
router.delete('/delete/:id', discountController.deleteDiscount); // Novo: Brisanje popusta
router.put('/update', discountController.updateDiscount);
router.post('/remove', discountController.removeDiscount);

module.exports = router;