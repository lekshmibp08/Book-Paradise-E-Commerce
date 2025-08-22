const mongoose = require("mongoose"); 

var userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      required: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    token: {
      type: String,
      default: "",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    wishlist: {
      type: Array,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    history: {
      type: Array,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    redeemed: {
      type: Boolean,
      default: false,
    },
    isUsedReferral: {
      type: Boolean,
      default: false,
    },
    redeemedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);


//Export the model
module.exports = mongoose.model("User", userSchema);
