const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const TransactionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Transaction', TransactionSchema);