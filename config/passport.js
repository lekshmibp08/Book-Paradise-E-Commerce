const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:${
        process.env.PORT || 8000
      }/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        //let user = await User.findOne({googleId: profile.id});

        if (user) {
          return done(null, user);
        } else {
          const newUser = new User({
            googleId: profile.id,
            name: profile.name.givenName,
            mobile: "",
            email: profile.emails[0].value,
            password: "",
            isVerified: true,
            is_blocked: false,
            isAdmin: false,
          });
          user = await newUser.save();
          return done(null, user);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
