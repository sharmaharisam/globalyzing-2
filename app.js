require('dotenv').config();
const express = require("express");
const nodemailer = require('nodemailer');
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const multer = require('multer');
const { stringify } = require('querystring');
const LocalStrategy = require('passport-local').Strategy;
const async = require('async');
const crypto = require("crypto");

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname+"/public"));


mongoose.connect(process.env.MONGO_URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  email : String,
  password: String,
  googleId: String,
  firstName: String,
  lastName: String,
  phone : Number,
  college : String,
  department : String,
  year : Number,
  cgpa : String,
  cv : Buffer,
  resetPasswordToken : String,
  resetPasswordExpires : Date,
});

const profSchema = new mongoose.Schema({
email : String,
name : String,
});

const applicantSchema = new mongoose.Schema({
profName : String,  
name :String,
department : String,
year : Number,
cgpa : String,
cv : String,
sop : String,
college : String,
department : String,
});
mongoose.set('useCreateIndex', true);
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);
const Prof = new mongoose.model("Prof",profSchema);
const Applicant = new mongoose.model("Applicant",applicantSchema);
 passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://globalyzing.com/auth/google/globalyzing",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id,
      email : (profile.emails)[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,

    }, function(err, user) {
      return cb(err, user);
    });
  }
));


// get requets :
app.get("/", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("home-logged-in", {
      user: req.user
    });
  } else {
    res.render("home");
  }
});

app.get("/auth/google",
  passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

app.get("/auth/google/globalyzing",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    if(req.user.cv){
      res.redirect("/");
    } else {
      res.redirect("/profile");
    }
  });

app.get("/register", function(req, res) {
  res.render("register");
})

app.get("/login", function(req, res) {
  res.render("login");
})

app.get("/contact", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("contact-logged-in", {
      user: req.user
    });
  } else {
    res.render("contact");
  }
})

app.get("/about", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("about-logged-in", {
      user: req.user
    });
  } else {
    res.render("about");
  }
})

app.get("/services", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("services-logged-in", {
      user: req.user
    });
  } else {
    res.render("services");
  }
})

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/profile", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("profile", {
      user: req.user,
    });
  } else {
    res.redirect("/");
  }
})

app.get("/apply", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("apply", {
      user: req.user
    });
  } else {
    res.redirect("/");
  }
})

app.get("/thanks",function(req,res){
  if (req.isAuthenticated()) {
    res.render("thanks", {
      user: req.user
    });
  } else {
    res.redirect("/");
  }
})

app.get("/users/:id/cv" ,async(req,res)=>{
 try {
   const user = await User.findById(req.params.id);
   if(!user || !user.cv){
     throw new Error();
   }
   res.set('Content-Type' ,'application/pdf')
   res.send(user.cv);
   
 } catch(e){
   res.status(404).send();
   console.log(40404040404);
   
 }
});

app.get("/profs/:id/all",async(req,res)=>{
  const prof =  await Prof.findById(req.params.id);
 
    if(!prof){
      throw new Error();
    } else {
      const name = prof.name;
      Applicant.find({"profName" :  name },function(err,foundApplicants){
        if(err){
         console.log(err);
        } else {
        if(foundApplicants){
          res.render("prof-all", {
            prof : prof,
            applicants : foundApplicants,
          })
        }  
        }
      });
    } 
});
app.get("/profs/:id/sop" , function(req,res){
  if (req.isAuthenticated()) {
   res.render("sop")
  } else {
    res.redirect("/");
  }
})
// post requests :

app.post("/register", function(req, res) {

  User.register({
    username: req.body.username,
    email : req.body.username,
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/profile");
      });
    }
  });

});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        if(req.user.cv){
          res.redirect("/");
        } else {
          res.redirect("/profile");
        }
      });
    }
  });
});
var upload = multer({ 
limits : {
  fileSize : 7000000
},
fileFilter(req,file,cb){
  if(!file.originalname.match(/\.(pdf)$/)){
    return cb(new Error("please upload a pdf"))
  }
  cb(undefined,true);
}
 });
app.post("/profile",upload.single('cv'),function(req, res, ) {
User.updateOne({_id : req.user._id},{
firstName : req.body.firstName,
lastName : req.body.lastName,
phone : req.body.phone,
college : req.body.college,
department : req.body.department,
year : req.body.year,
cgpa : req.body.cgpa,
cv : req.file ? req.file.buffer : undefined,
},function(err){
  if(err){
    console.log(err);
    
  } else {
    console.log("successfully saved user profile");
           
  }
});
res.redirect("/");
});

app.post("/profs/:id/sop" , async(req,res)=>{
  const prof = await Prof.findById(req.params.id);
  const nameOfProf = prof.name;
  const nameOfApplicant = req.user.firstName + " " + req.user.lastName ;
  const applicant = new Applicant({
  profName : nameOfProf,
  name : nameOfApplicant,
  year : req.user.year,
  cgpa : req.user.cgpa,
  sop : req.body.sop,
  college : req.user.college,
  department : req.user.department,
  cv : "/users/" + req.user._id +"/cv" ,
  });
  applicant.save(function(err){
  if(err){
    console.log(err);
  } else {
    console.log("applicant details saved successfully");
  }
  });
  res.redirect("/thanks");
});

// forgot password
app.get('/forgot', function(req, res) {
  res.render('forgot');
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'sharmaharisam@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'sharmaharisam@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
         
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'sharmaharisam@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'sharmaharisam@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}



app.listen(port, function() {
  console.log("server started successfully");
})
