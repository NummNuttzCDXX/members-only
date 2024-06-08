/* eslint-disable new-cap */
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const asyncHandler = require('express-async-handler');
const {body, validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', {title: 'Express'});
});

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

module.exports = router;
