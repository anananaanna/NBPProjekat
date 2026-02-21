const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/stores/'); },
    filename: (req, file, cb) => {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 1. FIKSNE RUTE (Prvo one koje nemaju :id) ---
router.get('/all', storeController.getAllStores); 
router.get('/trending/top', storeController.getTop3Stores);
router.get('/all-cached', storeController.getAllStores);
router.post('/create', upload.single('logo'), storeController.createStore);
router.put('/update', storeController.updateStore);
router.put('/add-discount', storeController.addProductToDiscount);

// --- 2. RUTE SA PARAMETRIMA (Uvek idu na kraj) ---
router.get('/:id', storeController.getStoreById);
router.get('/:id/categories', storeController.getStoreCategories);
router.get('/:id/products', storeController.getStoreProducts);
router.delete('/delete/:id', storeController.deleteStore);
router.get('/suggested/:userId', storeController.getSuggestedStores);

router.get('/update-popularity/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const session = req.neo4jSession;
        
        // Pozivamo funkciju koju smo napisali u kontroleru
        await storeController.updateStorePopularity(id, session);
        
        res.status(200).json({ message: `Popularnost za prodavnicu ${id} je uspešno osvežena u Redisu!` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;