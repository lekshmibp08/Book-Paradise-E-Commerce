const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const WalletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true 
    },
    balance: {
        type: Number,
        default: 0, 
        required: true
    },
    transactions: [{
        type: Schema.Types.ObjectId,
        ref: 'Transaction'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Wallet', WalletSchema);