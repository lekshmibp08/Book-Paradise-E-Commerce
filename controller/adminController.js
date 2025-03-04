const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");


const User = require("../models/userModel");
const Order = require('../models/orderSchema')


//Render Login Page
const getLoginPage = async (req, res) => {
    try {
        res.render("adminLogin")
    } catch (error) {
        console.log(error.message);
    }
}


//Admin Login
const verifyLogin = expressAsyncHandler( async (req, res) => {
    const { email, password } = req.body
    console.log(email);

    const findAdmin = await User.findOne({email:email})
    if(!findAdmin) {
        res.render("adminLogin", { message : "Incorrect Email ID"})
    }
    console.log(findAdmin);
    if(findAdmin) {
        const paaswordMatch = await bcrypt.compare(password, findAdmin.password)
        if (paaswordMatch) {
            req.session.admin = true;
            console.log("Admin Logged In");
            res.redirect("/admin/dashboard")
        } else {
            console.log("Incorrect Password");
            res.render("adminLogin", { message : "Incorrect Password"})
        }
    }
})


//Admin Log Out
const adminLogout = expressAsyncHandler( async(req, res) => {
    console.log("Admin logout");
    req.session.destroy()
    res.redirect("/admin/login")
})


//Render Dashboard
const getDashboard = async(req, res) => {
    try {
        const statistics = await findStatistics();

        const topProducts = await findTopProducts();
        const topCategory = await findTopCategory();
        const orderData = await processOrdersData();
        const categorySalesData = await generateCategorySalesData();
        console.log(categorySalesData);

        res.render("dashboard", {
            statistics,
            topProducts,
            topCategory,
            orderData,
            categorySalesData
        });
    } catch (error) {
        console.log('ERROR: ', error);
    }
}

async function processOrdersData() {
    try {
        const ordersGroup = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { status: { $ne: 'Pending'}},
                        { $and: [
                            { paymentMethod: 'Cash on Delivery'},
                            { $nor: [{ status: 'Cancelled'}, { status: "Pending"}]}
                        ]}
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        week: { $week: '$createdAt'}
                    },
                    total: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    week: '$_id.week',
                    total: 1
                }
            }
        ])

        const orderData = ordersGroup.reduce((acc, order) =>{
            if (!acc[order.year]) {
                acc[order.year] = {};
            }

            if (!acc[order.year][order.month]) {
                acc[order.year][order.month] = {};
            }

            acc[order.year][order.month][order.week] = order.total;

            return acc;

        }, {})

        return orderData;

    } catch (error) {
        console.log('ERROR: ', error);
    }
}


//Logic to generate category wise sales
async function generateCategorySalesData() {
    try {
        const categorySalesData = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { status: { $ne: 'Pending' } },
                        { 
                            $and: [
                                { paymentMethod: 'Cash on Delivery' },
                                { $nor: [{ status: 'Cancelled' }, { status: "Pending" }] }
                            ] 
                        }
                    ]
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        week: { $week: '$createdAt' },
                        category: '$product.category'
                    },
                    totalSales: { $sum: '$items.total' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    week: '$_id.week',
                    category: '$_id.category',
                    totalSales: 1
                }
            }
        ]);
        console.log(categorySalesData);

        const processedData = categorySalesData.reduce((acc, { year, month, week, category, totalSales }) => {
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += totalSales;
            return acc;
        }, {});
    
        // Convert the processedData object into an array of { category, sales } objects
        return Object.entries(processedData).map(([category, sales]) => ({ category, sales }));

    } catch (error) {
        console.error('ERROR: ', error);
        throw error;
    }
}


//Logic to find Total Sale, New Users, Orders and Total Coupon Discount
async function findStatistics() {
    try {
        const result = await Order.aggregate([
            {
                $project: {
                    netAmount: {
                        $add: [
                            { $subtract: ['$totalAmount', '$couponDiscout']},
                            50  
                        ]
                    },
                    couponDiscount: '$couponDiscout' 
                }
            },
            {
                $group: {
                    _id: null,
                    totalNetSale: { $sum: '$netAmount' },
                    totalCouponDiscount: { $sum: '$couponDiscount' } 
                }
            }
        ]);

        let totalNetSale = 0;
        let totalCouponDiscount = 0;

        if (result.length > 0) {
            totalNetSale = result[0].totalNetSale;
            totalCouponDiscount = result[0].totalCouponDiscount;
        }


        // Create a new Date object representing the current date and time
        const oneMonthAgo = new Date();

        // Adjust the date to one month ago from the current date
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Query the User collection to count documents (users) created on or after `oneMonthAgo`
        const totalOrders = await Order.countDocuments({ createdAt: { $gte: oneMonthAgo } });
        const newUsers = await User.countDocuments();

        return {
            newUsers, totalNetSale, totalCouponDiscount, totalOrders
        }
    } catch (error) {
        console.log("Error: ", error);
    }
}

//Function to find Top 10 Selling Products
async function findTopProducts(){
    const totalSalesPerProduct = await Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.product", totalSales: { $sum: "$items.quantity" } } },
        { 
          $lookup: {
            from: "products", 
            localField: "_id",
            foreignField: "_id",
            as: "productInfo"
          } 
        },
        { $unwind: "$productInfo" },
        { 
          $project: { 
            _id: 1, 
            totalSales: 1, 
            productName: "$productInfo.productName" 
          } 
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 }
    ]);

      return totalSalesPerProduct      
}


//Function to find Top 10 Selling Categories
async function findTopCategory(){
    const topCategories = await Order.aggregate([
        { $unwind: "$items" }, 
        { 
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productInfo"
          } 
        },
        { $unwind: "$productInfo" },
        { 
          $group: { 
            _id: "$productInfo.category",
            totalSales: { $sum: "$items.quantity" } 
          } 
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 } 
      ]);

     return topCategories;
}


module.exports = {
    getLoginPage,
    verifyLogin,
    getDashboard,
    adminLogout
}