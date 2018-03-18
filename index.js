var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session')
var flash = require('express-flash');

var server = app.listen(8081, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Web app listening at http://%s:%s", host, port)
});
var io = require('socket.io')(server);
//server.listen(80);

/* set EJS as default view engine */
app.set('view engine', 'ejs');
/*setting public folder*/
app.use(express.static('public'));

/* Setting express middlewares */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(require('express-session')({
  secret: 'Killer92i',
  resave: false,
  saveUninitialized: true

}));

app.use(flash());

/* End Middleware part */


/* Setting  MQTT client */
const mqtt = require('mqtt');
var mqttClient = mqtt.connect('mqtt:localhost:1883', {
  clean: true,
  username: "Server",
  password: "root",
  clientId: 'ADAS Web Server '

});





/* WebSocket Part Debut */
io.on('connection', function (socket) {


  /*socket.on('specificRequest', function (from, msg) {
   console.log('I received a private message by ', from, ' saying ', msg);
 });*/


  socket.on('specificRequest', function (data) {
    console.log("specific request", data);
    if (mqttClient.connected) {
      mqttClient.publish("specificRequest/" + data.username, data.payload, { qos: 2, retain: false });
    }
  });

  socket.on('positionRequest', function (data) {
    console.log(data);
    if (mqttClient.connected) {
      mqttClient.publish("positionRequest/" + data.username, data.payload, { qos: 2, retain: false });
    }
  });
  console.log("Hello Websocket Client");

  socket.on('disconnect', function () {
    console.log("ciao")
    io.emit('user disconnected');
  });
});
/* Websocket End*/



/* Setting Database driver and ORM framework */

var MongoClient = require('mongodb').MongoClient;
var mongoose = require("mongoose");
var bcrypt = require('bcrypt');
var salt = "$2a$10$ddP8SBnh8bf9rKQKY/mx9u";
var schema = mongoose.Schema;


/*Database name*/
var mongoDB = 'mongodb://localhost/ADAS_db';
mongoose.connect(mongoDB);



/*Creating a Shema for user*/

var userSchema = new schema({
  userName: String,
  firstName: String,
  lastName: String,
  email: String,
  password: String
});
var positionSchema = new schema({
  userName: String,
  date: String,
  latitude: String,
  longitude: String

})

userSchema.pre('save', function (next) {
  if (this.password) {

    this.password = bcrypt.hashSync(this.password, salt)
  }
  next()
})

/* Creating Main Routine schema */
var MainRoutineSchema = new schema({
  username: String,
  date: String,
  mode1: [schema.Types.Mixed],
  DTCs: [String]
});


var UserModel = mongoose.model('user', userSchema);
var PositionModel = mongoose.model('position', positionSchema);
var MainRoutineModel = mongoose.model("diagnostic", MainRoutineSchema);
//UserModel.create({userName:"yacine",firstName:"yacine",lastName:"chaabane",password:"yacine",email:"yacine.chaabane94@gmail.com"});
//PositionModel.create({username:"ahmed",date:"2018-03-01'T'13:34:30'Z'",latitude:"36.8991958",longitude:"10.1909842"})
//PositionModel.create({username:"yacine",date:"2018-03-01'T'13:34:30'Z'",latitude:"36.8991958",longitude:"10.1909842"})
//PositionModel.create({username:"ramzi",date:"2018-03-01'T'13:34:30'Z'",latitude:"36.8991958",longitude:"10.1909842"})

//MainRoutineModel.create({username:"ahmed",date:"2018-03-01'T'13:34:30'Z'",mode1:[{pid1:5},{pid2:7}],DTCs:["P000"]});







/*MQTT connection listeners*/
mqttClient.on('connect', (connack) => {

  if (connack.sessionPresent) {
    console.log('Already subbed, no subbing necessary');
  } else {
    console.log('First session! Subbing.');

    /*topic */
    mqttClient.subscribe('mainRoutine/+', { qos: 2 });
    mqttClient.subscribe('carPosition/+', { qos: 2 });
    mqttClient.subscribe(' specificResponse/+', { qos: 2 });


  }
});


mqttClient.on('message', (topic, message) => {
  console.log(`Received message: '${message}'`);
  /* dispatch message to one of the connected users */
  if (topic.search(/mainRoutine/) > -1) {
    /* save MainRoutine*/

  }

  else if (topic.search(/carPosition/) > -1) { /* save Car position */

    io.emit(topic, message);
  }
  else {
    io.emit(topic, message);
  }


});


/*End MQTT Listeners*/




/* example functions */

/*Find all users */
/*UserModel.find(function(err,user) {
  console.log(user);
});*/

/* Find all positions by car's owner username */
/*PositionModel.find({username:"ramzi"},function(err,user) {
  console.log(user);
});*/

MainRoutineModel.find({ username: "ramzi" }, function (err, user) {
  console.log(user);
});




/* Routes */


app.get('/', function (req, res) {
  //res.send('Hello World');
  if (req.session.username === undefined) {
    //console.log("usernam  ",req.session.username)
    res.render("page/login");

  }
  else {
    res.redirect('/home')
  }

})




app.post('/', function (req, res) {
  console.log(req.body.username)
  console.log(req.body.pass)

  UserModel.find({ userName: req.body.username }, function (err, docs) {
    if (docs.length) {
      console.log('User Name exists');
      var hashPwd = bcrypt.hashSync(req.body.pass, salt);
      UserModel.find({ password: hashPwd }, function (err, docs) {
        if (docs.length) {

          console.log('correct password');
          /*Session=req.session;
          Session.username;
          console.log(req.session)*/
          req.session.username = req.body.pass;
          req.session.pass = req.body.pass;
          console.log("session    :  ", req.session);
          //res.render("page/home");
          res.redirect("/home");
        }
        else {
          console.log("wrong password")
        }
      })

    } else {

      console.log("wrong username")
    }
  });


});

app.get("/register",function(req,res){
  if (req.session.username === undefined) {

    res.render('page/register');

  }
  else {

    
    
    res.redirect('page/home');
  }




});
app.get('/home', function (req, res) {
  if (req.session.username === undefined) {

    res.redirect('/');

  }
  else {

    console.log("cookie name", req.session.username)
    res.cookie('user', req.session.username)
    res.render('page/home');
  }
})



app.get('/profile', function (req, res) {
  //res.send('Hello World');
  if (req.session.username === undefined) {

    res.redirect('/');

  }
  else {

    res.render('page/profile');
  }
})


//return postion
app.get('/getPosition', function (req, res) {

  PositionModel.find(function (err, docs) {
    if (docs.length) {

      //console.log(docs);


    }

  })

  PositionModel.findOne().sort({ date: -1 }).exec(function (err, position) { //console.log("postion ",post);

    res.end(JSON.stringify(position));
  });



})


app.get('/diagnostic', function (req, res) {
  if (req.session.username === undefined) {

    res.redirect('/');

  }
  else {

    res.render('page/diagnostic');
  }
})

app.get('/carPosition', function (req, res) {
  if (req.session.username === undefined) {

    res.redirect('/');

  }
  else {

    res.render('page/carPosition');
  }
})

app.get('/getUser/:userName', function (req, res) {
  var userName = req.params.userName;
  UserModel.find({ userName: userName }, function (err, docs) {

    console.log(docs[0]);
    res.end(JSON.stringify(docs[0]))



  })






});

app.get('/logout', function (req, res) {
  res.clearCookie("user", req.session.username);

  req.session.destroy(function (err) {
    if (err) {
      console.log(err);
    } else {

      res.redirect('/');
    }
  });




});

app.get('*', function (req, res) {

  if (req.session.username === undefined) {

    res.redirect('/');

  }
  else {

    res.render('page/404');
  }

})