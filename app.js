/* eslint-disable no-console */
require('dotenv').config(); // Load environment vars
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Users = require('./models/Users');

const indexRouter = require('./routes/index');

const app = express();

// Connect to DB w/ Mongoose
async function connectDB(key) {
	await mongoose.connect(key)
		.then(() => console.log('DB Connected successfully'))
		.catch((err) => console.log(err));
}
connectDB(process.env.MONGODB_URI);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Setup session & MongoStore to store the session data to Mongo
app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	store: MongoStore.create({
		mongoUrl: process.env.MONGODB_URI,
		collectionName: 'sessions',
		ttl: 2 * 24 * 60 * 60 * 1000,
		autoRemove: 'native',
	}),
	cookie: {maxAge: 2 * 24 * 60 * 60 * 1000}, // Expires: 2 days
}));

app.use(passport.session());

// Setup LocalStrategy
// Checks if correct username and pass are entered to log user in
passport.use(new LocalStrategy(async (username, password, done) => {
	try {
		const user = await Users.findOne({username: username});

		if (!user) { // user not found
			return done(null, false, {message: 'Incorrect Username'});
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) { // Passwords do not match
			return done(null, false, {message: 'Incorrect Password'});
		}

		// Success!
		return done(null, user);
	} catch (err) {
		return done(err);
	}
}));

/* Sends the user ID to the session
Runs on authentication (`passport.authenticate()`) */
passport.serializeUser((user, done) => done(null, user.id));

/* Gets the user ID from the session and uses it to
find the user in the database */
/* Runs on every sent request (`req.user`) so user can be accessed
on the server */
passport.deserializeUser(async (id, done) => {
	try {
		const user = await Users.findById(id);
		done(null, user);
	} catch (err) {
		done(err);
	}
});


app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
