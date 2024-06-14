/* eslint-disable new-cap */
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const Messages = require('../models/Messages');
const asyncHandler = require('express-async-handler');
const {body, validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const {formatDistanceToNow} = require('date-fns');

/* GET home page. */
router.get('/', asyncHandler(async (req, res, next) => {
	const messages = await Messages.find()
		.populate('author')
		.sort({'dateData.date': -1}) // Sort dates in desc order
		.exec();

	// Only format dates if User is a Member
	if (req.user && req.user.member) {
		// Format all message dates
		const updateProms = [];
		messages.forEach((msg) => {
			// Update each msg format data and push to array
			updateProms.push(
				msg.updateOne({$set: {dateData: {
					date: msg.dateData.date,
					format: formatDistanceToNow(msg.dateData.date),
					lastFormatted: new Date(),
				}}}),
			);

			/*
			 * Format the msg in memory to avoid having to re-fetch from DB
			 * to display the formatted dates
			 *
			 * Without this, the `messages` array would not have the updated dates
			 */
			msg.dateData.format = formatDistanceToNow(msg.dateData.date);
		});

		// Await all update Promises
		await Promise.all(updateProms);
	}

	res.render('index', {
		title: 'Members-Only',
		messages: messages,
		user: req.user,
	});
}));

// POST Message to Board
router.post('/', [
	body(['title', 'message'])
		.trim()
		.isLength({min: 1})
		.withMessage('Fields cannot be blank')
		.escape(),

	asyncHandler(async (req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			const messages = await Messages.find()
				.populate('author')
				.sort({'dateData.date': -1})
				.exec();

			return res.render('index', {
				title: 'Members-Only',
				messages: messages,
				user: req.user,
				errors: errors.array(),
			});
		}

		// No Errors! - Create message
		const currentDate = new Date();
		const msg = new Messages({
			title: req.body.title,
			body: req.body.message,
			dateData: {
				date: currentDate,
				format: formatDistanceToNow(currentDate),
				lastFormatted: new Date(),
			},
			author: req.user._id,
		});

		await msg.save();

		// Add msg to user
		await User.findByIdAndUpdate(req.user.id, {$push: {msgs: msg}});

		// Re-Render page with new message
		res.redirect('/');
	}),
]);

// GET Sign-Up page
router.get('/sign-up', (req, res, next) => {
	res.render('sign-up', {
		title: 'Register Account',
	});
});

// POST Sign-Up page -- Create new User
router.post('/sign-up', [
	// Sanitize / validate fields
	body(['firstName', 'lastName'])
		.trim()
		.isLength({min: 1})
		.withMessage('Name must have at least 1 character')
		.escape(),
	body('username')
		.trim()
		.isLength({min: 5})
		.withMessage('Username must have at least 5 characters')
		.escape(),
	body(['pass', 'confPass'])
		.trim()
		.isLength({min: 5})
		.withMessage('Password must have at least 5 characters')
		.escape(),
	// Confirm passwords match
	body('confPass').custom((val, {req}) => {
		return val === req.body.pass;
	}).withMessage('Passwords do not match'),

	// Create User
	asyncHandler(async (req, res, next) => {
		// Extract errors
		const errors = validationResult(req);

		// Create User with sanitized data
		const user = new User({
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			username: req.body.username,
			password: req.body.pass,
		});

		if (!errors.isEmpty()) {
			/* There are errors!
			Re-render form with sanitized values */
			return res.render('sign-up', {
				title: 'Register Account',
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				username: req.body.username,
				errors: errors.array(),
			});
		}

		/* No Errors!
		Encrypt password & Save User */
		bcrypt.hash(user.password, 10, async (err, hashedPass) => {
			if (err) next(err);

			user.password = hashedPass;
			await user.save();
		});

		res.redirect('/'); // Redirect Homepage
	}),
]);

// GET Login page
router.get('/login', (req, res, next) => {
	res.render('login', {
		title: 'Login',
	});
});

// POST Login - Authenticate user login credentials
router.post('/login', [
	// Sanitize/Validate username & password
	body(['username', 'password'])
		.trim()
		.isLength({min: 5})
		.withMessage('Inputs must have at least 5 characters')
		.escape(),

	// Authenticate User
	(req, res, next) => {
		// Extract form errors
		const errors = validationResult(req);

		if (!errors.isEmpty()) { // There are errors
			// Re-Render form
			return res.render('login', {
				title: 'Login',
				username: req.body.username,
				errors: errors.array(),
			});
		}

		// No errors - Authenticate User
		passport.authenticate('local', (err, user, info) => {
			if (err) return next(err); // Handle errors during authentication

			if (!user) { // Authentication fails - incorrect username / password
				return res.render('login', {
					title: 'Login',
					username: req.body.username,
					errors: [{msg: info.message}],
				});
			}

			// Authentication succeeds! - Login User
			req.logIn(user, (err) => {
				if (err) return next(err);
				res.redirect('/'); // Redirect to homepage
			});
		})(req, res, next); /* `passport.authenticate(...)` returns a middleware
		function that needs to be called - Hence `(req, res, next)` */
	},
]);

module.exports = router;
