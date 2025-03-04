const Razorpay = require('razorpay');
const crypto = require('crypto');
const Wallet = require('../models/walletSchema');
const Transaction = require('../models/transactionSchema');
const Order = require('../models/orderSchema');
const Product = require('../models/productModel');


let razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})


// Render the add money form
const getAddMoneyForm = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        res.render('addmoney', { title: "Add Money" });
    } catch (error) {
        console.error('Error rendering add money form:', error);
        res.status(500).redirect('/login');
    }
};


// Initiate a Razorpay payment order
const initiatePayment = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const { amount, note } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt_${new Date().getTime()}`,
            notes: {
                description: note || 'Adding money to wallet'
            }
        };

        const order = await razorpayInstance.orders.create(options);
        res.json(order);
    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
};


//
const verifyPayment = async( req, res ) =>{
    try {
        const userId = req.session.user;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, note } = req.body;

        const generated_signature = crypto.createHmac('sha256', razorpayInstance.key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            try {
                let wallet = await Wallet.findOne({ userId })
                if( !wallet ){
                    wallet = new Wallet({ userId, balance: 0, transactions: [] })
                }
                wallet.balance += amount / 100;
                const transaction = new Transaction({
                    userId,
                    amount: amount / 100,
                    description: note || "Added to wallet",
                    type: 'credit',
                    status: 'completed'
                })
                await transaction.save();
                wallet.transactions.push(transaction._id);
                await wallet.save();
                res.json({ success: true, message: 'Payment verified and wallet updated' });

            } catch (error) {
                console.error('Error updating wallet:', error);
                res.status(500).json({ success: false, message: 'Server error' }); 
            }
            
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
}


module.exports = {
    getAddMoneyForm,
    initiatePayment,
    verifyPayment

}