var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var validator = require('validator');

var UserSchema = new mongoose.Schema({
	fullName: {
		type: String,
		required: true,
		trim: true
	},
	emailAddress: {
		type: String,
		unique: true,
		required: true,
		trim: true,
		minlength: 1
	},
	password: {
		type: String,
		required: true
	}
});

//authenticate input against database doc
// UserSchema.statics.authenticate = function(email, password, callback) {
//   User.findOne({emailAddress: emailAddress})
//   .exec(function(error, user) {
//     if (error) {
//       return callback(error);
//     } else if(!user){
//       var err = new Error('User not found.');
//       err.status = 401;
//       return callback(err);
//     }
//     bcrypt.compare(password, user.password, function(error, result) {
//       if (result === true) {
//         return callback(null, user);
//       } else {
//         return callback();
//       }
//     });
//   });
// }

// hash password before saving to database
UserSchema.pre('save', function (next) {
  var user = this;
  bcrypt.hash(user.password, 10, function(err, hash) {
    if(err){
      return next(err);
    }
    user.password = hash;
    next();
  });
});

//ensure email is unique
UserSchema.path('emailAddress').validate(function (value, done) {
  this.model('User').count({ emailAddress: value }, function (err, count) {
    if (err) {
      return done(err);
    }
    // if count is greater than zero invalidate the request
    done(!count);
  });
}, 'This email address is already being used by another user.');

// validate email
UserSchema.path('emailAddress').validate(function (v) {
  return validator.isEmail(v);
}, 'Email is invalid.');

var User = mongoose.model('User', UserSchema);
module.exports = User;