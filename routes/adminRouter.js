const express = require("express")
const router = express.Router()


const { uploadCategory, uploadProduct } = require('../helpers/multer');
const adminController = require("../controller/adminController")
const customerController = require("../controller/customerController")
const categoryController = require("../controller/categoryController")
const productController = require("../controller/productController")
const couponController = require("../controller/couponController")
const orderController = require("../controller/adminOrderController")
const returnOrders = require('../controller/returnOrders')
const reportController = require('../controller/reportController')

const  {isAdmin} = require("../Athentication/auth")

//Admin Actions
router.get("/login", adminController.getLoginPage)
router.post("/login", adminController.verifyLogin)
router.get("/dashboard", isAdmin, adminController.getDashboard)
router.get("/logout", isAdmin, adminController.adminLogout)



// Customer Management
router.get("/users", isAdmin, customerController.getCustomerInfo)
router.get("/blockCustomer", isAdmin, customerController.getBlockCustomer)
router.get("/unblockCustomer", isAdmin, customerController.getUnblockCustomer)


// Category Management
router.get("/category", isAdmin, categoryController.getCategoryInfo)
router.post("/addCategory", isAdmin, uploadCategory.single('image'), categoryController.addCategory)
router.post("/blockCategory", isAdmin, categoryController.blockCategory)
router.post("/unBlockCategory", isAdmin, categoryController.unBlockCategory)
router.post("/category/apply-offer", isAdmin, categoryController.applyCategoryOffer)


//Product Management
router.get("/products", isAdmin, productController.getAllProducts)
router.get("/addProducts", isAdmin, productController.getProductAddPage)
router.post("/addProducts", isAdmin, uploadProduct.array("productImage", 4), productController.addProducts)
router.get("/editProduct", isAdmin, productController.getEditProduct)
router.post("/editProduct/:id", isAdmin, uploadProduct.array("productImage", 4), productController.editProduct)
router.delete("/deleteProductImage/:productId/:imageName", isAdmin, productController.deleteImage)
router.post("/blockProduct", isAdmin, productController.blockProduct)
router.post("/unBlockProduct", isAdmin, productController.unblockProduct)
router.post("/products/apply-offer", isAdmin, productController.applyProductOffer)


//Coupon Management
router.get("/addCoupon", isAdmin, couponController.getAddCoupon)
router.post("/addCoupon", isAdmin, couponController.addCoupon)
router.get("/coupons", isAdmin, couponController.getAllCoupon)
router.patch('/coupons/:id/block', isAdmin, couponController.blockCoupon)
router.patch('/coupons/:id/unblock', isAdmin, couponController.unblockCoupon)
router.get('/coupons/:id/edit', isAdmin, couponController.getEditCoupon)
router.put('/coupons/:id/edit', isAdmin, couponController.updateCoupon)


//Order Management
router.get("/orders", isAdmin, orderController.getOrderListPage)
router.post("/orders/status", isAdmin, orderController.changeOrderStatus)
router.post("/orders/cancel", isAdmin, orderController.cancelOrder)
router.get("/orders/orderDetails", isAdmin, orderController.getOrderDetails)

//Return Orders
router.get("/return-orders", isAdmin, returnOrders.getReturnOrders)
router.get("/return-orders/:id", isAdmin, returnOrders.viewReturnOrderDetails)
router.post("/return-orders/:id/status", isAdmin, returnOrders.updateReturnOrderStatus)

//Sales Reports
router.get("/reports", isAdmin, reportController.getSalesReport)
router.post("/reports/generate-report", isAdmin, reportController.generateReport)
router.get("/reports/generate-excel-report", isAdmin, reportController.generateExcelReport)


module.exports = router;