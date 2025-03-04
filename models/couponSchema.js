const Mongoose = require("mongoose")

const couponSchema =  Mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    code : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    minAmount : {
        type : Number,
        required : true
    },
    maxDiscount : {
        type : Number,
        required : true
    },
    discount : {
        type : Number,
        required : true,
        min: 0,
        max: 100
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    usedBy: [{
        type: Mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
})

const Coupon = Mongoose.model("Coupon", couponSchema)

module.exports = Coupon