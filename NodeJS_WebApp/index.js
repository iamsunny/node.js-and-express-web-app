var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var sessions = require('client-sessions');
var cookieParser = require('cookie-parser')

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(sessions({
    cookieName: 'session',
    secret: 'mySecretKey',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

app.use(cookieParser());


app.set('view engine', 'ejs');
//app.set('views', __dirname + '/templates');

//connect to mongo
mongoose.connect('mongodb://localhost/test');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User = mongoose.model('User', new Schema({
    id: ObjectId,
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: String
}));


var port = process.env.PORT;


app.use(function (request, response, next) {
    
    if (request.session && request.session.user) {
        User.find({ email: request.session.user.email }, function (err, user) {
            if (user) {
                request.user = user;
               // delete request.user.password;
                app.locals.user = request.user;
                request.session.user = request.user;
            }
            
            next();
            
        });
    }
    else {
        next();
    }
});


function requireLogin(request, response, next) {
    if (!request.user) {
        response.redirect('/login');
    } else {
        next();
    }
}





app.get('/', function (request, response) {
    response.render('home');
});


app.get('/login', function (request, response) {
    response.render('login');
});



app.post('/login', function (request, response) {
    User.findOne({ email: request.body.email }, function (err, user) {
        if (!user) {
            response.render('login', { errorMessage: 'Invalid Email or Password.' })
        } else {
            if (request.body.password === user.password) {
                request.session.user = user;
                response.redirect('/dashboard');
            } else {
                response.render('login', { errorMessage: 'Invalid Email or Password' });
            }
        }
    });

});

app.get('/logout', function (request, response) {
    request.session.reset();
    app.locals.user = undefined;
    response.redirect('/');
});




app.get('/register', function (request, response) {
    response.render('register');
});


app.post('/register', function (request, response) {
    var user = new User({
        firstName: request.body.firstname,
        lastName: request.body.lastname,
        email: request.body.email,
        password: request.body.password,
    });
    
    user.save(function (err) {
        if (err) {
            var error = "something bad happened! please try again.";
            
            if (err.code === 11000) {
                error = 'This email is already taken, please try again!';
            }
            
            response.render('register', { errorMessage: error });
        }
        else {
            app.locals.userLoggedIn = true;
            response.redirect('/dashboard');
        }
    });
});



app.get('/dashboard', requireLogin, function (request, response) {
    response.render('dashboard');
});


app.listen(port, function () {
    console.log("listening on port: " + port);
})
