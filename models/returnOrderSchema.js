
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const returnOrderSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    returnReason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Requested', 'In Process', 'Approved', 'Rejected', 'Canceled', 'Returned'],
        default: 'Requested'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ReturnOrder', returnOrderSchema);
