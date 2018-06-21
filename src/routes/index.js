'use strict';
var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Course = require('../models/course');
var Review = require('../models/review');
var mid = require('../middleware');

// different routes go here
router.get('/', function(req, res, next) {
	return res.send('home route tested');
});

// users get route
router.get('/users', function(req, res, next) {
	var authorisedUser = {};
	authorisedUser.data = [];
	authorisedUser.data.push(req.user);
	console.log(req.user);
	//send response json
	res.json(authorisedUser);
});


//post data
router.post('/users', function(req, res, next) {
	// if passwords not filled out
  // create new User
  var user = new User();
  // assign schema fullName to the full name from request
  user.fullName = req.body.fullName;
  user.emailAddress = req.body.emailAddress;
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  // save the user
  user.save(function (err) {
    // if errors
    if (err) {
      var errorMessages = {
        message: 'Validation Failed',
        errors: {}
      };
      // handle validation errors
        if (err.name === 'ValidationError') {
          for (var error in err.errors) {
            errorMessages.errors[error] = [{
              code: 400,
              message: err.errors[error].message
            }];
          }
          console.log(errorMessages);
          return res.status(400).json(errorMessages);
        } else {
          // else send error to error handler
          return next(err);
    }
  }
    res.status(201);
    res.location('/');
    res.end();
  });
});

router.get('/courses', function(req, res, next){
	//returns course id and title
	Course.find({}, '_id title', function(err, courses) {
		if(err) return next(err);
		var allCourses = {};
		allCourses.data = courses;
		//send json response
		res.json(allCourses);
	});
});

router.get('/courses/:courseId', function(req, res, next) {
	//returns all course properties and docs related to the course ID
	//paths to populate
	var queryParams = [
		{path: 'reviews.user'},
		{path: 'user'}
	];
	User.populate(req.course, queryParams, function(err, course){
		if(err){
			return next(err);
		}
		var thisCourse = {};
		thisCourse.data =[];
		thisCourse.data.push(course);
		res.json(thisCourse);
	})
});

router.post('/courses', function(req, res, next) {
	var course = new Course(req.body);
	//creates a course, sets location header and returns no content
	course.save(function(err){
		if(err) {
			var errorMessages = {
				message: 'Validation Failed',
				errors: {}
			};
			//handle validation errors
			if(err.name === 'ValidationError') {
				for (var error in err.errors) {
					errorMessages.errors[error] = [{
						code: 400,
						message: err.errors[error].message
					}];
				}
				console.log(errorMessages);
				return res.status(400).json(errorMessages);
			} else {
				return next(err);
			}
		}
		res.status(201);
		res.location('/courses/' + course._id);
		res.end();
	});
});

router.put('/courses/:courseId', mid.auth, function(req, res, next){
	//updates courses and returns no content
	for (var i = 0; i<req.body.steps.length; i++) {
		req.body.steps[i].stepNumber = i + 1;
	}
	req.course.update(req.body, { runValidators: true }, function (err, course) {
		console.log(req.body);
		// if the user is not the one who made the course
		if (req.user._id != req.body.user._id) {
		  //unauthorised
		  res.send(401);
		  res.end();
		};
		// if error
		if (err) {
		  var errorMessages = {
		    message: 'Validation Failed',
		    errors: {}
		  };
		  // handle validation errors
	    if (err.name === 'ValidationError') {
	      for (var error in err.errors) {
	        errorMessages.errors[error] = [{
	          code: 400,
	          message: err.errors[error].message
	        }];
	      }
	      console.log(errorMessages);
	      return res.status(400).json(errorMessages);
	    } else {
	      // else send error to error handler
	      return next(err);
			}
		}
		// send 204 status
		res.status(204);
		res.end();
	});
});

// post review
router.post('/courses/:courseId/reviews', mid.auth, function (req, res, next) {
  // create new review
  var review = new Review(req.body);
  review.user = req.user;
  // find one course with specific course id
  // return only reviews & usersWhoReviewed
  Course.findOne({_id: req.params.courseId}, 'reviews', function (err, course) {
    // if error send to the error handler
    if (err) { return next(err); }
      // else push the new review into Course.reviews
      course.reviews.push(review);
      // make sure the user cannot write another review
      course.save(function (err) {
        // if error pass to error handler
        if (err) { return next(err); }
      });
      // save the review
      review.save(function (err) {
        // if any errors
        if (err) {
          // check for validation errors
          if (err.name === 'ValidationError') {
            return res.status(400).json({
              message: 'Validation Failed', errors: { property: [ { code: 400, message: err.errors.rating.message } ] }
            });
          } else {
            // else send error to error handler
            return next(err);
          }
        }
        // send 201 status
        res.status(201);
        // sets Location header
        res.location('/courses/' + course._id);
        res.end();
      });
  });
});

// DELETE /api/courses/:courseId/reviews/:id 204 - Deletes the specified review and returns no content
router.delete('/courses/:courseId/reviews/:id', mid.auth, function (req, res, next) {
  // create a promise to prevent users who didn't create the review from deleting them
   var reviewAuth = Review.findOne({_id: req.params.id}, function (err, review) {
  //   // if error send to error handler
     if (err) { return next(err); }
     console.log(req.user);
     console.log(review);
       if (req.user._id !== review.user) {
         res.send(401);
         res.end();
         return
       }
   });
  // find specific course that matches course id in url
  // return only reviews & usersWhoReviewed
  reviewAuth.then(Course.findOne({_id: req.params.courseId}, 'reviews', function (err, course) {
    // if error send to error handler
    if (err) { return next(err); }
    // splice out the deleted review from course.reviews array
    course.reviews.splice(course.reviews.indexOf(req.params.id), 1);
    // save the course
    course.save(function (err) {
      // if error send to error handler
      if (err) { return next(err); }
    });
    // send 204 status
    res.status(204);
    res.end();
  })
  );
});



module.exports = router;