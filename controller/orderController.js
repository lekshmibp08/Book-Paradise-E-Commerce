const mongodb = require('mongodb')
const User = require('../models/userModel')
const Address = require('../models/addressSchema')
const Product = require('../models/productModel')
const Coupon = require('../models/couponSchema')
const Cart = require('../models/cartSchema')
const Order = require('../models/orderSchema')
const razorpay = require('razorpay');
const ReturnOrder = require('../models/returnOrderSchema')
const Wallet = require('../models/walletSchema')
const Transaction = require('../models/transactionSchema')
const pdf = require('html-pdf-node');
const path = require('path');
const ejs = require('ejs'); 
const fs = require('fs')
const { log } = require('console')

let razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET

})


const getCheckoutPage = async( req, res ) =>{
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).populate('items.product').exec();
        const products = cart.items.map(item => ({
            ...item.product._doc,
            itemQuantity: item.itemQuantity,
            price: item.price,
        }));
        let grandTotal = cart.totalPrice + 50 - cart.discount;
        const addresses = await Address.find({ userId: userId })
        const totalSave = cart.totalMRP - cart.totalPrice + cart.discount;
        
        res.render('checkout', { addresses, cart, products, grandTotal, totalSave })

    } catch (error) {
       console.log(error.message);
       res.status(400).render('error', { message: error.message }); 
    }
}


// Route to create Razorpay order
const createRazorpayOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
        }

        const cartExist = await Cart.findOne({ userId }).populate('items.product');    
        if (!cartExist) {
            return res.status(400).json({ message: 'Cart Not Found' });
        }

        const outOfStockItem = cartExist.items.find(item => item.product.quantity === 0);
        if (outOfStockItem) {
            return res.json({ 
                success: false, 
                message: `The product "${outOfStockItem.product.productName}" in your cart is out of stock` 
            });
        }


        const totalAmount = cartExist.items.reduce((sum, item) => sum + item.price * item.itemQuantity, 0);
        const grandTotal = totalAmount - cartExist.discount + 50;

        const options = {
            amount: grandTotal * 100,
            currency: 'INR',
            receipt: Date.now().toString() + Math.floor(Math.random() * 1000)
        };

        razorpayInstance.orders.create(options, (err, razorpayOrder) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Razorpay order creation failed', error: err });
            }
            res.json({ success: true, razorpayOrder });
        });
    } catch (error) {
        console.log(error.message);
        res.status(400).json({ message: error.message });
    }
};


//Place Order Logic
const placeOrder = async( req, res ) =>{
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.s(401).json({ message: 'User not logged in' });
        }
        const cartExist = await Cart.findOne({ userId }).populate('items.product');    
        if (!cartExist) {
            return res.status(400).json({ message: 'Cart Not Found' });
        }

        const { paymentMethod, billingAddress, paymentStatus } = req.body;
        if (!paymentMethod || !billingAddress) {
            return res.status(400).json({ message: 'Payment method and billing address are required' });
        }

        const outOfStockItem = cartExist.items.find(item => item.product.quantity === 0);
        if (outOfStockItem) {
            return res.json({ 
                success: false, 
                message: `The product "${outOfStockItem.product.productName}" in your cart is out of stock` 
            });
        }

        const orderItems = cartExist.items.map(item => ({
            product: item.product._id,
            quantity: item.itemQuantity,
            total: item.price * item.itemQuantity
        }));

        const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
        const orderId = Date.now().toString() + Math.floor(Math.random() * 1000);

        let finalPaymentStatus = 'Pending';
        if (paymentMethod === 'Razorpay' && paymentStatus === 'Paid') {
            finalPaymentStatus = 'Completed';
        } else if (paymentMethod !== 'Razorpay') {
            finalPaymentStatus = 'Completed';
        }
        console.log("WORKING JUST B4 ORDER CREATE");
        const order = new Order({
            orderId: orderId,
            userId: cartExist.userId,
            items: orderItems,
            totalAmount,
            couponDiscout: cartExist.discount,
            billingAddress: billingAddress,
            shippingAddress: billingAddress,
            paymentMethod: paymentMethod,
            status: 'Pending',
            paymentStatus: finalPaymentStatus, 
            returnStatus: 'Not Requested'
        });
        
        
        const grandTotal = order.totalAmount - order.couponDiscout + 50;

        if (paymentMethod === 'Wallet') {
            let wallet = await Wallet.findOne({userId: userId})
            if(wallet.balance < grandTotal) {
                return res.json({ 
                    success: false, 
                    message: "!!..Insufficient Balance in your Wallet..!!" 
                });
            }
            wallet.balance -= grandTotal;
            let transaction = new Transaction({
                userId: userId,
                amount: grandTotal,
                description: "Wallet Payment for order",
                type: "debit",
                status: 'completed'
            });
            await transaction.save();
            wallet.transactions.push(transaction._id);
            await wallet.save();
        }

        await order.save();
        
        const items = order.items;
        for( const item of items){
            const { product, quantity } = item;
            await Product.findByIdAndUpdate(product, { $inc: { quantity: -quantity } });
        }

        cartExist.items = [];
        cartExist.totalPrice = 0;
        cartExist.totalMRP = 0;
        cartExist.discount = 0;
        cartExist.couponApplied = null;
        await cartExist.save();

        if (cartExist.couponApplied) {
            await Coupon.updateOne({ _id: cartExist.couponApplied }, { $addToSet: { usedBy: userId } });
        }

        res.json({ success: true, message: 'Order placed successfully', orderId: order.orderId });
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message }); 
    }

}


const getOrderSuccessPage = async( req, res ) => {
    try {
        res.render('success')
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Get Order Details Page
const getOrderDetails = async( req, res ) =>{
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
        .populate('items.product')
        .populate('billingAddress');

        if (!order) {
            return res.status(400).render('error', { message: 'Order Details not Found' });
        }
        const grandTotal = order.totalAmount + 50
        res.render('order-details', { order, grandTotal })

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Order Cancell Logic
const cancelOrder = async( req, res ) =>{
    try {
        const orderId = req.query.id;
        const orderData = await Order.findById(orderId);

        if (!orderData) {
            return res.status(404).json({ flag: false, message: 'Order not found' });
        }
        if (['Pending', 'Processed', 'Shipped'].includes(orderData.status)) {
            orderData.status = 'Cancelled';
            await orderData.save();

    //Refund for Razorpay Payment
            if(orderData.paymentMethod === "Razorpay" || orderData.paymentMethod === "Wallet"){
                console.log("paymentMethod Working");
                const user = orderData.userId
                let wallet = await Wallet.findOne({ userId: user })
                
                if( !wallet ){
                    wallet = new Wallet({ userId: user, balance: 0, transactions: [] })
                }

                const description = `Refund, Order Id: ${orderData.orderId}`
                let refundAmount = orderData.totalAmount - orderData.couponDiscout;
                wallet.balance += refundAmount

                const transaction = new Transaction({
                    userId: user,
                    amount: refundAmount,
                    description: description,
                    type: "credit",
                    status: 'completed'
                });

                await transaction.save();
                wallet.transactions.push(transaction._id);
                await wallet.save();

            }

            const items = orderData.items;
            for( const item of items){
                const { product, quantity } = item;
                await Product.findByIdAndUpdate(product, { $inc: { quantity: quantity } });
            }
            return res.status(200).json({ flag: true, message: 'Order cancelled successfully' });

        } else {
            return res.status(400).json({ flag: false, message:'Order cannot be cancelled' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Return all ordered products
const getReturnOrderForm = async( req, res ) =>{
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('items.product');

        if (!order || order.status !== 'Delivered') {
            return res.status(404).send('Order not found or not eligible for return');
        }
        res.render('return-request-form', { order });
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Handle Return Order
const processReturnOrder = async( req, res ) =>{
    try {
        const orderId = req.params.id;
        const { returnReason } = req.body;

        const order = await Order.findById(orderId).populate('items.product');

        if (!order || order.status !== 'Delivered') {
            return res.status(404).send('Order not found or not eligible for return');
        }

        const returnOrder = new ReturnOrder({
            orderId,
            userId: req.session.user, 
            returnReason,
            status: 'Requested'
        });
        await returnOrder.save();

        order.status = 'Return Requested';
        order.returnStatus = 'Requested';
        await order.save();

        res.redirect('/profile?tab=orders');
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Cancel Return Request
const cancelReturnRequest = async( req, res ) =>{
    try {
        const orderId = req.params.id;

        await Order.findByIdAndUpdate(orderId, {
            status: 'Delivered',
            returnStatus: 'Canceled'
        });
        await ReturnOrder.findOneAndUpdate({ orderId }, {
            status: 'Canceled'
        });
        res.redirect('/profile?tab=orders');
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


const getInvoice = async( req, res ) => {
    try {
        const orderId = req.params.orderId;
        const userId =  req.session.user;

        const orderData = await Order.findById(orderId)
            .populate('items.product')
            .populate('billingAddress')
            .exec();
        const userData = await User.findById(userId)

        res.render('invoice', {orderData, userData})
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


const downloadInvoice = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;

        // Fetch order data and user data
        const orderData = await Order.findById(orderId)
            .populate('items.product')
            .populate('billingAddress')
            .exec();

        const userData = await User.findById(userId); // Fetch user data

        if (!orderData) {
            return res.status(404).render('error', { message: 'Order Not Found..!' });
        }

        // Generate HTML content from template
        const htmlContent = await generateHtml(orderData, userData);

        // PDF options
        const options = { format: 'A4' };

        // Generate PDF from HTML
        const pdfBuffer = await pdf.generatePdf({ content: htmlContent }, options);

        // File path to save the PDF temporarily
        const filePath = path.join(__dirname, 'invoice.pdf');

        // Write the PDF buffer to a file
        fs.writeFileSync(filePath, pdfBuffer);

        // Send the generated PDF as download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="invoice.pdf"',
        });
        res.sendFile(filePath, {}, (err) => {
            // Delete the file after sending
            fs.unlinkSync(filePath);
            if (err) {
                console.log(err);
                res.status(err.status).end();
            } else {
                console.log('File was sent successfully and deleted.');
            }
        });

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
};


// Generate HTML from EJS template
const generateHtml = async (orderData, userData) => {
    return new Promise((resolve, reject) => {
        
        ejs.renderFile(path.join(__dirname, '../views/user/invoice.ejs'), { orderData: orderData, userData: userData}, (err, html) => {
            if (err) {
                reject(err);
            } else {
                resolve(html);
            }
        });
    });
};


//Pay After placing Order
const createOrderForPayNow = async(req, res ) => {
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const totalAmount = order.totalAmount - order.couponDiscout + 50;

        const amount = totalAmount * 100; 
        const currency = 'INR';
        const options = {
            amount,
            currency,
            receipt: order.orderId,
        };

        await razorpayInstance.orders.create(options, (err, response) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Razorpay order creation failed', error: err });
            }
            console.log("SUCCESS RESPONSE SEND");
            res.json({
                id: response.id,
                currency: response.currency,
                amount: response.amount
            });
        });

        
    } catch (error) {
        console.log(error.message);
        res.status(500).render('error', { message: error.message });
    }
}


//Verify Razorpay Payment for Pay Now
const verifyPayNowPayment = async( req, res ) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
        const order = await Order.findById(orderId);

        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');
        
        if (generatedSignature === razorpay_signature) {
            order.paymentMethod = 'Razorpay';
            order.paymentStatus = 'Completed';
            await order.save();
            
            res.json({ success: true, message: 'Payment successful' });

        } else {
            res.json({ success: false, message: 'Payment failed' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}






module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrderSuccessPage,
    getOrderDetails,
    cancelOrder,
    getReturnOrderForm,
    processReturnOrder,
    cancelReturnRequest,
    createRazorpayOrder,
    getInvoice,
    downloadInvoice,
    createOrderForPayNow,
    verifyPayNowPayment,
}