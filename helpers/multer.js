const multer = require('multer');
const path = require('path');

// Category storage engine
const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/category-images/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Product storage engine
const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Initialize multer with separate storage engines
const uploadCategory = multer({ storage: categoryStorage });
const uploadProduct = multer({ storage: productStorage });

module.exports = {
    uploadCategory,
    uploadProduct
};
