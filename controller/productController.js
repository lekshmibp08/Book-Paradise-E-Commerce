const Product = require("../models/productModel")
const Category = require("../models/categoryModel")
const fs = require("fs")
const path = require("path")
const { log } = require("console")


//Render Add Product Page
const getProductAddPage = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true })
        res.render("addProducts", { category: categories })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Add Product and product Details
const addProducts = async(req, res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({ productName: products.productName})
        if(productExists){
            res.json({ status: "failed", message: "Product already exists" });
        } else{
            const images = []
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    images.push(req.files[i].filename);
                }
            }
            const newProduct = new Product({
                id: Date.now(),
                productName: products.productName,
                description: products.description,
                authorTitle: products.authorTitle,
                category: products.category,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                authorDetails: products.authorDetails,
                quantity: products.quantity,
                language: products.language,
                productImage: images
            })
            await newProduct.save()
            res.json({ status: "success", message: "Product added successfully" });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Render Product Page
const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1 ) * limit;

        const products = await Product.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const totalProducts = await Product.countDocuments({});
        const totalPages = Math.ceil(totalProducts/limit);

        res.render("products", { 
            products,
            currentPage: page,
            totalPages,
            limit 
        })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Render Edit Product Page
const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id
        const findProduct = await Product.findOne({ _id: id })
        const category = await Category.find({})
        res.render("editProducts", { product: findProduct, category: category })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Edit and update Product details
const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const product = await Product.findById(id)
        
        let existingImages = product.productImage || [];

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                existingImages.push(file.filename);
            });
        }


        const updatedProduct = await Product.findByIdAndUpdate(id, {
            productName: data.productName,
            description: data.description,
            authorTitle: data.authorTitle,
            category: data.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            authorDetails: data.authorDetails,
            quantity: data.quantity,
            language: data.language,
            productImage: existingImages
        }, { new: true });

        res.status(200).json({ status: 'success', message: 'Product updated successfully.' });
    } catch (error) {
        console.log(error.message);
        //res.status(500).json({ status: 'error', message: 'An error occurred while editing the product.' });
        res.status(400).render('error', { message: 'An error occurred while editing the product.' });
    }
};

// To Delete Product Image
const deleteImage = async (req, res) => {
    try {
        const { productId, imageName } = req.params;

        // Remove image from productImage array in Product document
        const updatedProduct = await Product.findByIdAndUpdate(productId, {
            $pull: { productImage: imageName }
        });

        // Optionally, delete the image file from the file system
        const imagePath = path.join(__dirname, '../public/uploads/product-images', imageName);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        res.json({ status: 'success', message: 'Image deleted successfully.' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(400).render('error', { message: 'Image Deleted error' });
        //res.status(500).json({ status: 'error', message: 'Failed to delete image.' });
    }
}


//Block Product
const blockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Unblock Product
const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Apply Product Offer
const applyProductOffer = async( req, res ) => {
    try {

        const { offerids, offerPercentage } = req.body;
        const products = await Product.find({_id: {'$in': offerids } })

        for(const product of products) {
            const category = await Category.findOne({name: product.category})
            let categoryOfferPercentage = category.categoryOffer;
            let categoryOfferPrice = Math.ceil( product.regularPrice * (100 - categoryOfferPercentage) / 100 );
            let productOfferPrice = Math.ceil( product.regularPrice * (100 - offerPercentage) / 100 ) ;
            if (categoryOfferPrice < productOfferPrice) {
                product.salePrice = categoryOfferPrice;
            } else {
                product.salePrice = productOfferPrice;                
            }
            product.productOffer = offerPercentage;
            await product.save();
        }
        res.json({message:"offer applied successfully"})
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


module.exports = {
    getProductAddPage,
    getAllProducts,
    addProducts,
    getEditProduct,
    editProduct,
    deleteImage,
    blockProduct,
    unblockProduct,
    applyProductOffer
}