// Message Model/Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const msgSchema = new Schema({
	title: {type: String, required: true},
	body: {type: String, required: true}, // The Message
	dateData: {
		date: {type: Date, default: new Date(), required: true},
		format: String,
		lastFormatted: Date,
	},
	author: {type: mongoose.Types.ObjectId, ref: 'Users', required: true},
});


module.exports = mongoose.model('Messages', msgSchema);
