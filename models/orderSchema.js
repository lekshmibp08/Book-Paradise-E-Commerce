const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const orderSchema = new Schema({
    orderId: {
        type: 'String',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,    
        ref: 'User',
        required: true
    },
    items: [
        {
            product: { 
                type: Schema.Types.ObjectId, 
                ref: 'Product', 
                required: true },
            quantity: { 
                type: Number, 
                required: true },
            total: { 
                type: Number, 
                required: true }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    couponDiscout: {
        type: Number,
        default: 0
    },
    billingAddress: {
        type: Schema.Types.ObjectId,
        ref: 'address',
        required: true
    },
    shippingAddress: {
        type: Schema.Types.ObjectId,
        ref: 'address'
    },
    paymentMethod: {
        type: String,
        enum: ['Paypal', 'Payoneer', 'Check Payment', 'Direct Bank Transfer', 'Razorpay', 'Wallet', 'Cash on Delivery'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Processed', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Return Requested', 'Request Processed'],
        default: 'Pending'
    },
    returnStatus: {
        type: String,
        enum: ['Not Requested', 'Requested', 'Approved', 'Rejected', 'Canceled'],
        default: 'Not Requested'
    },
    returnReason: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed'],
        
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});


const Order = mongoose.model("Order", orderSchema); 

module.exports = Order; 

