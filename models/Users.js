// User model/Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
	firstName: {type: String, required: true},
	lastName: {type: String, required: true},
	username: {type: String, required: true},
	password: {type: String, required: true},
	member: {type: Boolean, default: false},
	admin: {type: Boolean, default: false},
	msgs: [{type: mongoose.Types.ObjectId, ref: 'Messages'}],
});


// Full Name virtual GETTER
userSchema.virtual('name').get(function() {
	return `${this.firstName} ${this.lastName}`;
});


module.exports = mongoose.model('Users', userSchema);
