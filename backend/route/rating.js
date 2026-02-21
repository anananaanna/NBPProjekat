const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

// 1. Dodavanje ili ažuriranje ocene (pokreće updateStorePopularity u Redisu)
router.post('/add', ratingController.addRating);


router.put('/update', ratingController.updateRating);

// 2. Dobijanje prosečne ocene prodavnice (koristi Cache-Aside sa Redisom)
router.get('/avg/:storeId', ratingController.getStoreRating);

// 3. Brisanje ocene (smanjuje score u Redisu)
router.delete('/delete', ratingController.deleteRating);

// 4. Dobijanje svih pojedinačnih ocena za jednu prodavnicu
router.get('/all/:storeId', ratingController.getAllRatingsForStore);

router.get('/user/:userId/store/:storeId', ratingController.getUserRatingForStore);


module.exports = router;