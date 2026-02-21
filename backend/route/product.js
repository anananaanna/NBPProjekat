const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const multer = require('multer');
const path = require('path');

// Konfiguracija za čuvanje slika na tvom disku
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ako u ruti ili polju prepoznamo o čemu se radi, šaljemo u podfolder
        if (file.fieldname === "logo") {
            cb(null, 'uploads/stores/');
        } else {
            cb(null, 'uploads/products/');
        }
    },
    filename: (req, file, cb) => {
        const prefix = file.fieldname === "logo" ? "logo-" : "prod-";
        cb(null, prefix + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// BITNO: Ruta mora biti /create da se poklopi sa frontendom
router.post('/add', upload.single('image'), productController.createProduct);

router.get('/all', productController.getAllProducts);
// Proveri da li je 'image' isto ime kao u formData.append('image', ...)
router.put('/update', upload.single('image'), productController.updateProduct);
router.delete('/delete/:id', productController.deleteProduct);
router.post('/link-store', productController.linkProductToStore);
router.get('/search', productController.searchProducts);
router.post('/set-discount', productController.setDiscount);
router.get('/store/:storeId', productController.getProductsByStoreAndCategory);
router.get('/recommended/:userId', productController.getRecommendedProducts);
router.post('/search-history', productController.saveSearchHistory);
router.get('/search-history/:userId', productController.getSearchHistory);


module.exports = router;