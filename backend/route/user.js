const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Standardne rute
router.post('/register', userController.register);
router.post('/login', userController.login);

// IZMENA: Ruta za update sada ide na novu funkciju sa lozinkom
router.put('/update-profile', userController.updateUser);

// IZMENA: Brisanje ide preko ID-ja, ne preko username-a
router.delete('/delete/:id', userController.deleteUser); 

// Relacije (Sve koriste ID-jeve u Body-ju)
router.post('/follow-category', userController.followCategory);
router.post('/follow-store', userController.followStore);

// Wishlist rute
router.post('/wishlist/add', userController.addToWishlist);
router.post('/wishlist/remove', userController.removeFromWishlist);

// IZMENA: Dohvatanje liste ide preko ID-ja korisnika
router.get('/wishlist/:userId', userController.getWishlist); 

module.exports = router;