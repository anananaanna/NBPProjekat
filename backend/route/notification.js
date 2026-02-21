const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notificationController');

// Ruta za dohvatanje notifikacija iz Redisa
router.get('/:userId', notifController.getNotifications);

// Ruta za brisanje (kad se korisnik odjavi ili klikne "obriši sve")
router.delete('/clear/:userId', async (req, res) => {
    const { userId } = req.params;
    const { connection } = require('../database');
    await connection.del(`notifications:${userId}`);
    res.status(200).json({ message: "Očišćeno" });
});
router.put('/:userId/mark-as-read', notifController.markAsRead);

module.exports = router;