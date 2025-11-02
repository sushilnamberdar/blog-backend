const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.SERVER_URL + '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 1️⃣ Check if user exists by Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // 2️⃣ If not, check if user already registered manually with same email
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }

          // 3️⃣ Create new user for Google login
          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
          });

          await newUser.save();
          return done(null, newUser);
        } catch (err) {
          console.error('Google auth error:', err);
          done(err, null);
        }
      }
    )
  );

  // 4️⃣ Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // 5️⃣ Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
