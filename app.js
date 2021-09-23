//jshint esversion:6
require('dotenv').config()
const express = require('express');

const ejs = require('ejs')
const mongoose = require('mongoose')
//const encrypt = require('mongoose-encryption')
//const md5 = require('md5');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb://localhost:27017/userDB')

const userSchema = mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model('User', userSchema);
// passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"

},
    function (accessToken, refreshToken, profile, cb) {

        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get('/', (req, res) => {
    res.render('home')
});
app.get('/auth/google',

    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/secrets');
    });
app.get('/submit', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('submit');
    } else {
        res.redirect('/login')
    }
});
app.get('/login', (req, res) => {
    res.render('login')
});
app.get('/register', (req, res) => {
    res.render('register')
});

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        User.find({ "secret": { $ne: null } }, (err, foundList) => {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets", { sharedSecrets: foundList })
            }
        })
    } else {
        res.redirect('/login')
    }
})
app.post('/register', (req, res) => {
    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            //res.redirect("/register")
            res.send(err.toString())
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })
});

app.post('/login', (req, res) => {
    let user = new User({
        email: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/secrets');
            })

        }

    });
});
app.post('/submit', (req, res) => {
    // console.log(req.user._id)
    const submittedSecret = req.body.secret;

    User.findById({ _id: req.user._id }, (err, foundItems) => {

        if (err) {
            console.log(err);
        } else {
            if (foundItems) {
                console.log(foundItems);
                foundItems.secret = submittedSecret;
                foundItems.save()
                res.redirect('/secrets')
            } else {
                res.redirect('/submit')
            }
        }
    })
});
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});



app.listen(3000, err => err ? console.log(err.toString()) : console.log('server is running'))