const User = require("../models/userModel")
const expressAsyncHandler = require("express-async-handler");


const getCustomerInfo = expressAsyncHandler( async (req, res) => {
    const userData = await User.find({ isAdmin:false });
    console.log(userData);
    res.render("customers", { users:userData })
})

const getBlockCustomer = expressAsyncHandler( async(req, res) => {
    const id = req.query.id;
    //console.log(id);
    await User.updateOne({ _id:id }, { $set: { isBlocked:true }})
    res.redirect("/admin/users")
})


const getUnblockCustomer = expressAsyncHandler( async(req, res) => {
    const id = req.query.id;
    //console.log(id);
    await User.updateOne({ _id:id }, { $set: { isBlocked:false }})
    res.redirect("/admin/users")
})


module.exports = {
    getCustomerInfo,
    getBlockCustomer,
    getUnblockCustomer
}