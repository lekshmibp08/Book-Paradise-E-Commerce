const Cart = require('../models/cartSchema')
const User = require('../models/userModel')
const Product = require('../models/productModel')
const Coupon = require('../models/couponSchema')
const mongodb = require("mongodb")
const moment = require('moment')


//Render Cart Page
const getCartPage = async( req, res) =>{
    try {
        const userId = req.session.user
        const cart = await Cart.findOne({ userId }).populate('items.product').exec();
        console.log(cart);
        if (!cart) {
            res.render('cart', { cart: null, products: [], grandTotal: 0 });
            return;
        }
        const products = cart.items.map(item => ({
            ...item.product._doc,
            itemQuantity: item.itemQuantity,
            price: item.price,
        }));

        let grandTotal = cart.totalPrice + 50;
        res.render('cart', { cart, products, grandTotal });
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Add to Cart
const addToCart = async (req, res) => {
    try {
        console.log("Working");
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ status: "Please Login to add products to cart" });
        }
        const productId = req.query.id;
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(200).json({ status: false, message: "Product not found" });
        }
        if (product.quantity < 1) {
            console.log("ENTERED OUT OF STOCK");
            return res.status(200).json({ status: false, message: "Product Out of Stock"})
        }

        const cartExist = await Cart.findOne({ userId });

        if (cartExist) {
            const itemIndex = cartExist.items.findIndex(item => item.product.toString() === product._id.toString());

            if (itemIndex > -1) {
                return res.status(200).json({ status: true, message: 'Product is already in the cart'})
            } else {    
                // Add the new product to the cart
                cartExist.items.push({
                    product: productId,
                    name: product.productName,
                    MRP: product.regularPrice,
                    price: product.salePrice,
                    itemQuantity: 1
                });
                cartExist.totalPrice = cartExist.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
                cartExist.totalMRP = cartExist.items.reduce((acc, item) => acc + (item.MRP * item.itemQuantity), 0);
                await cartExist.save();
                return res.status(200).json({ status: true, message: "Product Added to Cart" });                        
            }
        } else {            
            // Create a new cart
            const newCart = new Cart({
                userId: userId,
                items: [{
                    product: productId,
                    name: product.productName,
                    MRP: product.regularPrice,
                    price: product.salePrice,
                    itemQuantity: 1
                }],
                totalPrice: product.salePrice ,
                totalMRP: product.regularPrice ,
                createdOn: Date.now()
            });
            await newCart.save();
            return res.status(200).json({ status: true, message: "Product Added to Cart" });
                
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
};


// Update the Cart Quantity
const changeQuantity = async (req, res) => {
    try {
        console.log("working");
        const userId = req.session.user;
        const productId = req.body.productId;
        const newQuantity = parseInt(req.body.newQuantity);

        const product = await Product.findById(productId);
        const stock = product.quantity;

        if(newQuantity >= 1 && newQuantity <= stock && newQuantity < 6){
            const cart = await Cart.findOne({ userId });
            const productIndex = cart.items.findIndex(item => item.product == productId);

            if (productIndex === -1) {
                return res.status(404).json({ error: "Product not found in cart" });
            } else {
                cart.items[productIndex].itemQuantity = newQuantity;
                cart.totalPrice = cart.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
                cart.totalMRP = cart.items.reduce((acc, item) => acc + (item.MRP * item.itemQuantity), 0);
                await cart.save();
            }

            const subTotal = cart.totalPrice;
            const shipping = 50;
            const grandTotal = subTotal + shipping;
            res.status(200).json({ subTotal, grandTotal });
        } else {
            res.status(400).json({ error: "Invalid Quantity" });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).json({ error: error.message });
    }
}


//Delete Product From Cart
const deleteCartProduct = async( req, res) =>{
    try {
        console.log("Working");
        const id = req.query.id;
        console.log("Product ID : ", id);
        const userId = req.session.user;
        const user = await User.findById(userId)
        const cartExist = await Cart.findOne({userId})
        if ( !cartExist ){
            return res.status(400).json({ message: "Empty cart"})
        }
        const itemIndex = cartExist.items.findIndex(item => item.product.toString() === id.toString());
        if (itemIndex === -1) {
            return res.status(400).json({ message: "Product not Found" })
        }
        
        cartExist.items.splice(itemIndex, 1);
        cartExist.totalPrice = cartExist.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
        
        await cartExist.save();
        console.log("Item deleted from cart");
        return res.status(200).json({ message: "Product Removed from the Cart" });
        
    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Show all Coupon List on Cart Page
const showCoupons = async( req, res ) =>{
    try {
        //let subTotal = req.body.subTotal
        const today = new Date()
        const coupons = await Coupon.find({ 
            status: true,
            createdDate: { $lt: new Date(today) },
            expiryDate: { $gt: new Date(today) },
        })
        const couponData = coupons.map( coupon => ({
            ...coupon._doc,
            expiryDate: moment(coupon._doc.expiryDate).format('MMMM D, YYYY')
        }))
        
       console.log(couponData);
       //console.log("subtotal :", subTotal);
       res.json({ success: true, coupons: couponData }); 
        //res.json(couponData)
    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Apply Coupon
const applyCoupon = async( req, res ) =>{
    try {
        console.log(req.body);
        const userId = req.session.user;
        const { couponId } = req.body;
        const coupon = await Coupon.findById(couponId);
        const user = await User.findById(userId);
        if( !user) {
            console.log("NO USER");
            return res.json({ success: false, message: 'User not Found. Please Login...' });
        }
        const couponUsed = await Coupon.findOne({
            _id : couponId,
            usedBy : userId
        })
        if( couponUsed ) {
            console.log("COUPON USED");
            return res.json({ success: false, message: 'A User can use a Coupon only once.' });
        }
        const cart = await Cart.findOne({userId : userId})
        if( cart.totalPrice < coupon.minAmount) {
            console.log("MINIMUM PURCHACE AMAOUNT");
            return res.json({ success: false, message: `Minimum Purchase Amound should be above ₹. ${coupon.minAmount}` });
        }

        let couponDiscount = Math.ceil((cart.totalPrice * coupon.discount) / 100); 

        if(couponDiscount > coupon.maxDiscount){
            console.log("MAX DISCOUNT");
            couponDiscount = coupon.maxDiscount;
        }

        const totalSave = cart.totalMRP - cart.totalPrice + couponDiscount;
        const grandTotal = cart.totalPrice + 50 - couponDiscount;
        await Cart.updateOne({userId : userId}, 
            {discount: couponDiscount, couponApplied: couponId}, {new:true});

            console.log("NEW CART:",cart );

            res.json({
                success: true,
                message: 'Coupon applied successfully',
                totalSave,
                grandTotal
            });

    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Remove Applied Coupon
const removeCoupon = async( req, res ) =>{
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({userId: userId});
        if( cart.couponApplied ){
            cart.couponApplied = null;
            cart.discount = 0;
            await cart.save();

            res.json({ success: true, message: 'Coupon removed successfully' });
        } else {
            res.status(400).json({ success: false, message: 'No coupon is applied to the cart' });
        }
    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
}


module.exports = {
    getCartPage,
    addToCart,
    changeQuantity,
    deleteCartProduct,
    showCoupons,
    applyCoupon,
    removeCoupon
}