const Mongoose = require('mongoose');

const addressSchema = new Mongoose.Schema({
    userId: {
        type: Mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    name: {
        type: String,
        require: true
    },
    mobile: { 
        type: String, 
        required: true 
    },
    addressLine: { 
        type: String, 
        required: true 
    },
    locality: { 
        type: String, 
        required: true 
    },
    city: { 
        type: String, 
        required: true 
    },
    state: { 
        type: String, 
        required: true 
    },
    pin: { 
        type: String, 
        required: true 
    },
    is_default: { 
        type: Boolean, 
        default: false 
    },
    addressType: { 
        type: String, 
        required: true 
    }
})

const address = Mongoose.model('address', addressSchema);

module.exports = address;