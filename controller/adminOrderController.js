const Product = require('../models/productModel')
const Categry = require('../models/categoryModel')
const User = require('../models/userModel')
const Coupon = require('../models/couponSchema')
const Address = require('../models/addressSchema')
const Order = require('../models/orderSchema')
const Wallet = require('../models/walletSchema')
const Transaction = require('../models/transactionSchema')
const { format } = require('date-fns')


//Render Order Page for Admin
const getOrderListPage = async( req, res ) =>{
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const orders = await Order.find({})
            .populate('items.product')
            .populate('userId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalOrders = await Order.countDocuments({});
        const totalPages = Math.ceil(totalOrders / limit);


        res.render('orders', {
            orders,
            totalPages,
            currentPage: page,
            limit,
            format 
        })

    } catch (error) {
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Update the order status
const changeOrderStatus = async( req, res ) =>{
    try {
        const orderId = req.body.orderId;
        const status = req.body.status;
        
            await Order.updateOne({ _id: orderId}, { status })
            res.redirect('/admin/orders')
    } catch (error) {
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Cancel Order by Admin
const cancelOrder = async( req, res ) =>{
    try {
        const orderId = req.query.id;
        const orderData = await Order.findById(orderId);

        if (!orderData) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (orderData.status === 'Pending') {
            orderData.status = 'Cancelled';
            await orderData.save();

            const items = orderData.items;
            for( const item of items){
                const { product, quantity } = item;
                await Product.findByIdAndUpdate(product, { $inc: { quantity: quantity } });
            }
            if(orderData.paymentMethod === 'Razorpay' || orderData.paymentMethod === 'Wallet') {
                const wallet = await Wallet.findOne({userId: orderData.userId})
                const refundAmount = orderData.totalAmount - orderData.couponDiscout;
                wallet.balance += refundAmount;
                const transaction = new Transaction({
                    userId: orderData.userId,
                    amount: refundAmount,
                    description: 'Order Cancellation',
                    type: 'credit',
                    status: 'completed'
                })
                await transaction.save(); 

                wallet.transactions.push(transaction._id);

                await wallet.save(); 
            }
            
            
            return res.status(200).json({ message: 'Order cancelled successfully' });

        } 

    } catch (error) {
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Render Order Details Page for Admin
const getOrderDetails = async( req, res ) =>{
    try {
        const orderId = req.query.id;
        const orderData = await Order.findById(orderId)
            .populate('userId')
            .populate('items.product')
            .populate('billingAddress')
            .populate('shippingAddress')
            .lean();
            
        res.render('order-detail', {
            orderData,
            format 
        })

    } catch (error) {
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}





module.exports = {
    getOrderListPage,
    changeOrderStatus,
    cancelOrder,
    getOrderDetails,
}