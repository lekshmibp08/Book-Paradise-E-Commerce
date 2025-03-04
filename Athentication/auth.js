const User = require("../models/userModel")

const isLogged = (req, res, next)=>{
    if(req.session.user){
        console.log("Inner Auth Working");
        User.findById({_id : req.session.user}).lean()
        .then((data)=>{
            if (data && data.isBlocked == false){
                next()
            }else{
                console.error('User not found');
                res.redirect("/login")
            }
        })
        .catch(error => {
            console.log(error.message);
            res.redirect("/login");
        });
    }else{
        res.render("login", { message: "User not found. Please Login" })
    }
}

const isAdmin = (req, res, next) => {
    if (req.session.admin) {
        User.findOne({ isAdmin: true })
            .then((data) => {
                if (data) {
                    next();
                } else {
                    res.redirect("/admin/login");
                }
            })
            .catch((error) => {
                console.error("Error in isAdmin middleware:", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect("/admin/login");
    }
};


module.exports = {
    isLogged,
    isAdmin
}