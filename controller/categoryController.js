const Category = require("../models/categoryModel")
const Product = require('../models/productModel')
const expressAsyncHandler = require("express-async-handler");


// Rendering the category page
const getCategoryInfo = expressAsyncHandler( async(req, res) => {
    const categoryData = await Category.find({})
    res.render("category", { category:categoryData})
})


// Add Category
const addCategory = expressAsyncHandler( async(req, res) => {
    const name = req.body.name;
    const image = req.file.filename;
    
    const categoryExists = await Category.findOne({ name:name })
    if (categoryExists) {
        console.log("Category already exists");
        res.status(400).json({ message: 'Category already exists' });
    } else {
        const newCategory = new Category({
            name : name,
            categoryImage : image
        })
        await newCategory.save()
        res.status(201).json({ message: 'Category added successfully' });    }
})

//Block Category
const unBlockCategory = async (req, res) => {
    try {
        let id = req.query.id
        await Category.updateOne({ _id: id }, { $set: { isListed: false } })
        console.log(Category.findOne({_id: id}));
        console.log("Category blocked")
        res.redirect("/admin/category")
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Unblock Category
const blockCategory = async (req, res) => {
    try {
        let id = req.query.id
        await Category.updateOne({ _id: id }, { $set: { isListed: true } })
        console.log("category unblocked")
        res.redirect("/admin/category")
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Apply Category Offer
const applyCategoryOffer = async( req, res ) => {
    try {
        const categoryId = req.body.categoryIds[0];
        const offerPercentage = req.body.offerPercentage;
        console.log(categoryId);
        
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, 
            {categoryOffer: offerPercentage},
            { new: true }
        )
        let categoryName = updatedCategory.name
        console.log(categoryName);
        const products = await Product.find({
            category: categoryName
        })
        console.log(products);

        for( const product of products ) {
            const newSalePrice = Math.ceil( product.regularPrice * (100 - offerPercentage) / 100 ) ;
            if (newSalePrice < product.salePrice) {
                product.salePrice = newSalePrice;
                
            } else {
                product.salePrice = Math.ceil( product.regularPrice * (100 - product.productOffer) / 100 ); 
            }
            product.categoryOffer = offerPercentage
            await product.save();
            console.log("inside: ",product );
        }
        res.json({message:"offer applied successfully"})
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


module.exports = {
    getCategoryInfo,
    addCategory,
    blockCategory,
    unBlockCategory,
    applyCategoryOffer
}