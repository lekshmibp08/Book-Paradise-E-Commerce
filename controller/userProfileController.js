const User = require("../models/userModel")
const Address = require("../models/addressSchema")
const Product = require("../models/productModel")
const Order = require('../models/orderSchema')
const Wallet = require('../models/walletSchema')
const Transaction = require('../models/transactionSchema')
const userController = require("../controller/userController")
const { format } = require('date-fns');

const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt");

const getUserProfile = async(req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }
        const userData = await User.findById(user).lean();
        const userAddress = await Address.find({ userId: user }).lean();
        const wishData = userData.wishlist
        const orderData = await Order.find({userId : user}).sort({ createdAt: -1 });

        const wallet = await Wallet.findOne({ userId : user });
        const transactions = await Transaction.find({userId: user}).sort({ createdAt: -1 })

        if (!userData) {
            console.log("No user data");
            return res.redirect('/login'); 
        } else {
            res.render('profile', { userData, userAddress, wishData, orderData, format, wallet, transactions });
        }

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Render AddAddress
const getAddAddress = async( req, res ) => {
    try {
        res.render('add-address')
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Add new Address
const AddAddress = async( req, res ) => {
    try {
        const id = req.session.user;
        const Data = req.body
        
        const address = new Address({
            userId: id,
            name: Data.name,
            mobile: Data.mobile,
            addressLine: Data.address,
            locality: Data.locality,
            city: Data.city,
            state: Data.state,
            pin: Data.pincode,
            is_default: Data ? true : false,
            addressType: Data.addressType
        })

        await address.save();
        res.redirect('/profile?tab=address')
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }
}

//Render Address Editing Page
const getEditAddress = async( req, res ) =>{
    try {
        const addressId = req.params.id;
        const user = req.session.user;
        const userData = await Address.findById(addressId)
        if( !userData ){
            return res.status(404).render('error', { message: 'Address not found' });
        }

        res.render('edit-address', { userData })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Edit Address
const editAddress = async( req, res ) =>{
    try {
        
        const id = req.params.id;
        const updatedUser = await Address.findByIdAndUpdate(id, {
            $set: {
                name: req.body.name,
                mobile: req.body.mobile,
                addressLine: req.body.address,
                locality: req.body.locality,
                city: req.body.city,
                state: req.body.state,
                pin: req.body.pincode,
                addressType: req.body.addressType
            }
        }, { new: true })
        res.redirect('/profile?tab=address')

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

// Delete Address
const deleteAddress = async (req, res) => {
    try {
        const id = req.params.id;
        await Address.findByIdAndDelete(id);
        res.redirect('/profile?tab=address');
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
};

//Edit User Profile
const editProfile = async( req, res ) =>{
    try {
        const user = req.session.user
        const userData = await User.findById(user).lean();
        res.render('edit-profile', { userData })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Update User Profile
const updateProfile = async( req, res ) =>{
    try {
        
        const id = req.params.id;

        const updatedUser = await User.findByIdAndUpdate(id, {
            $set: {
                name: req.body.name,
                mobile: req.body.mobile,
                email: req.body.email
            }
        }, { new: true })

        res.redirect('/profile')


    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Change Password
const changePassword = async( req, res ) =>{
    try {
        
        const userId = req.params.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if(newPassword !== confirmPassword){
            return res.status(400).json({ message: 'New Password and Confirm Password do not match.' });        }

        const user = await User.findById(userId)
        if(!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'You entered Incorrect Password.' });
        }
        const passwordHash = await userController.securePassword(newPassword)
        await User.findByIdAndUpdate(userId, { $set: { password: passwordHash }});

        res.status(200).json({ message: 'Password successfully changed.' });

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


const sortTransactions = async( req, res ) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect('/login');
        }

        const sortBy = req.query.sort; // Get sort criteria from query parameter
        let sortOptions = {};

        // Set sorting options based on sortBy value
        switch (sortBy) {
            case 'dateDesc':
                sortOptions = { createdAt: -1 };
                break;
            case 'dateAsc':
                sortOptions = { createdAt: 1 };
                break;
            case 'amountDesc':
                sortOptions = { amount: -1 };
                break;
            case 'amountAsc':
                sortOptions = { amount: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 }; // Default sort by newest date
                break;
        }

        const transactions = await Transaction.find({ userId: user }).sort(sortOptions);

        res.render('profile', { activeTab: 'wallet', transactions });

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}





module.exports = {
    getUserProfile,
    getAddAddress,
    AddAddress,
    editProfile,
    updateProfile,
    getEditAddress,
    editAddress,
    deleteAddress,
    changePassword,
    sortTransactions,
}