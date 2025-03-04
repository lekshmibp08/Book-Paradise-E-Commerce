const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartSchema");


//Render Wishlist Page
const getWishlistPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const productIds = user.wishlist;

        const products = await Product.find({ _id: { $in: productIds } });

        res.render('wishlist', { products, user });
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Add Product to Wishlist
const addToWishlist = async (req, res) => {
    try {
        const id = req.session.user;
        const productId = req.query.id;        
        const user = await User.findById(id);
        
        if (user) {
            const alreadyAdded = user.wishlist.includes(productId);
            if (alreadyAdded) {

                let updatedUser = await User.findByIdAndUpdate(id, {
                    $pull: { wishlist: productId }
                }, { new: true });
                res.status(200).json({ message: 'Removed from wishlist', productId, added: false });
    
            } else {
                let updatedUser = await User.findByIdAndUpdate(id, {
                    $push: { wishlist: productId }
                }, { new: true });
                res.status(200).json({ message: 'Added to wishlist', productId, added: true });
            }
        } else {
            res.status(404).json({ message: 'User not found. Please Login to access Wishlist...'});            
        }
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
        }
    };
    
    
//Remove product from Wishlist
const deleteFromWishlist = async( req, res ) =>{
    try {
        
        const userId = req.session.user;
        const productId = req.query.id;
        const updatedUser = await User.findByIdAndUpdate(userId, {
            $pull: { wishlist: productId}
        })
        res.redirect('/wishlist')
            
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });        
    }
}


const addToCartFromWishlist = async( req, res ) =>{
    try {
        const productId = req.params.id;
        const userId = req.session.user;
        const user = await User.findById(userId);
        const product = await Product.findById(productId)
        const wishIndex = user.wishlist.indexOf(productId);

        if(wishIndex > -1){
            user.wishlist.splice(wishIndex, 1);
            let cart = await Cart.findOne({userId: userId});
            if( !cart ){
                cart = new Cart({ userId: userId})
            }

            const cartIndex = cart.items.findIndex(item => 
                item.product.toString() === product._id.toString())

            if( cartIndex > -1 ){
                cart.items[cartIndex].itemQuantity += 1;
            } else {
                cart.items.push({
                    product: product._id,
                    name: product.productName,
                    MRP: product.regularPrice,
                    price: product.salePrice,
                    itemQuantity: 1
                });
            }
            cart.totalPrice = cart.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
            cart.totalMRP = cart.items.reduce((acc, item) => acc + (item.MRP * item.itemQuantity), 0);
            await cart.save();
            await user.save();
            res.json({ success: true, message: 'Product added to cart successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Product not found in wishlist' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}



module.exports = { 
    addToWishlist,
    getWishlistPage,
    deleteFromWishlist,
    addToCartFromWishlist 
};
