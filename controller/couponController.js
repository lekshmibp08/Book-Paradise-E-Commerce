const Coupon = require("../models/couponSchema")
const moment = require('moment')



//Render Coupon Page
const getAllCoupon = async(req, res) =>{
    try {
        const coupons = await Coupon.find({})
        const currentDate = new Date();
        res.render('coupon', {coupons, currentDate} )
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}



//Render Add Coupon Page
const getAddCoupon = async(req, res) =>{
    try {
        res.render("addCoupon")
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Add coupon Form submission
const addCoupon = async( req, res ) =>{
    try {
        const coupon = req.body;
        const couponExists = await Coupon.findOne({ code: coupon.couponCode})

        if( !couponExists) {
            const newCoupon = new Coupon({
                name: coupon.couponName,
                code: coupon.couponCode,
                description: coupon.description,
                minAmount: coupon.minPurchaseAmount,
                maxDiscount: coupon.maxDiscount,
                discount: coupon.discount,                 
                expiryDate: moment(coupon.expiryDate).format('MMMM D, YYYY')
                
            })
            await newCoupon.save();
            res.json({ status: 'success', message: 'Coupon added Successfully' });
            //res.redirect('/admin/coupons')
        } else {
            res.json({ status: 'failed', message: 'Coupon code already exists' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Block Coupon
const blockCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByIdAndUpdate(id, { status: false }, { new: true });
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        res.status(200).json({ message: 'Coupon blocked successfully', coupon });
    } catch (error) {
        res.status(400).render('error', { message: error.message });
    }
}


//Unblock A Coupon
const unblockCoupon = async( req, res ) =>{
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByIdAndUpdate(id, { status: true }, { new: true });
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        res.status(200).json({ message: 'Coupon unblocked successfully', coupon });
    } catch (error) {
        res.status(400).render('error', { message: error.message });
    }
}

//Get Edit Coupon Page
const getEditCoupon = async( req, res ) =>{
    try {
        const id = req.params.id;
        const coupon = await Coupon.findById(id);
        if( !coupon ){
            return res.status(404).json({ message: 'Coupon not found' });
        }
        console.log(coupon);
        res.status(200).render('editCoupon', {coupon})
    } catch (error) {
        res.status(400).render('error', { message: error.message });
    }
}

//Edit Coupon Details
const updateCoupon = async (req, res) => {
    try {
        const id = req.params.id;
        const { couponName, couponCode, description, minPurchaseAmount, discount, maxDiscount, expiryDate } = req.body;

        await Coupon.findByIdAndUpdate(id, {
            name: couponName,
            code: couponCode,
            description,
            minAmount: minPurchaseAmount,
            discount,
            maxDiscount,
            expiryDate
        });

        res.redirect('/admin/coupons');
    } catch (error) {
        res.status(400).render('error', { message: error.message });
    }
};


module.exports = {
    getAddCoupon,
    addCoupon,
    getAllCoupon,
    blockCoupon,
    unblockCoupon,
    getEditCoupon,
    updateCoupon
}