const Mongoose = require("mongoose")
const categoryModel =  Mongoose.Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    categoryImage : {
        type : String,
        required : true
    },
    isListed : {
        type : Boolean,
        default : true
    },
    categoryOffer : {
        type : Number,
        default : 0
    }
})

const Category = Mongoose.model("Category", categoryModel)

module.exports = Category