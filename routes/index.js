var express = require('express');
var router = express.Router();

var passport = require('passport');

//Pentru criptarea parolei
var bcrypt = require('bcrypt');
const saltRounds = 10;



/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('home', { title: 'Home' });
});



/* Authentication routes */
router.get('/login', function (req, res, next) {
  res.render('login', { title: 'Login' });
});


router.post('/login', passport.authenticate('local'),
  function (req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    res.redirect('/');
  });


router.get('/register', function (req, res, next) {
  res.render('register', { title: 'Registration' });
});


router.post('/register', function (req, res, next) {
  req.checkBody('email', 'Email field cannot be empty.').notEmpty();
  req.checkBody('email', 'Email is invalid, please try again.').isEmail();
  req.checkBody('password', 'Password field cannot be empty.').notEmpty();
  req.checkBody('password', 'Password must be between 5-20 characters long').len(5, 20);
  req.checkBody('passwordMatch', 'Passwords do not match, please try again').equals(req.body.password);
  req.checkBody('firstName', 'Don\'t you have a first name?').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    res.render('register', {
      title: 'Registration Error',
      errors: errors
    });
  } else {
    const email = req.body.email;
    const password = req.body.password;
    const firstname = req.body.firstName;
    const db = require('../db.js');


    var hash = bcrypt.hashSync(password, saltRounds);
    db.query('INSERT INTO users(email, passwordHash, firstname) VALUES (?, ?, ?)', [email, hash, firstname], function (error, results, fields) {
      if (error) throw (error);

      db.query('SELECT LAST_INSERT_ID() as user_id', function (error, results, fields) {
        if (error) throw (error);

        const user_id = results[0];
        console.log(user_id);
        req.login(user_id, function (err) {
          res.redirect('/');
        })
      })
    })
  }
});


router.get('/logout', function (req, res, next) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});


passport.serializeUser(function (user_id, done) {
  done(null, user_id);
})


passport.deserializeUser(function (user_id, done) {
  done(null, user_id);
})

//middleware pentru  verificare daca exista o sesiune activa pt user
function authenticationMiddleware() {
  return (req, res, next) => {
    console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

    if (req.isAuthenticated()) return next();
    res.redirect('/login')
  }
}

// END OF REGISTRATION

// EVENTS OPERATIONS

//Add an event, POST operation
router.get('/events', function (req, res, next) {
  res.render('events', { title: 'Events' });
});

router.post('/events', function(req, res, next){

  req.checkBody('name', 'Name field can\'t be empty.').isEmpty();
  req.checkBody('description','Description field can\'t be empty.').isEmpty();
  req.checkBody('category', 'Category field can\'t be empty.').isEmpty();
  req.checkBody('city', 'City field can\'t be empty').isEmpty();
  req.checkBody('sponsor', 'Sponsor field can\'t be empty.').isEmpty();

  const errors = req.validationErrors();
  if(errors){
    res.render('events', {
      title: 'There was an error',
      errors: errors,
    });
  } else {

    const name = req.body.eventName;
    const description = req.body.eventDescription;
    const category = req.body.eventCategory;
    const city = req.body.eventCity;
    const sponsor = req.body.eventSponsor;
    const country = req.body.eventCountry;

    const db = require('../db.js');

    var categ_id;
    var town_id;
    var sponsor_id;
    var country_id;
    db.query('SELECT Id FROM Categories WHERE CategName = \'' + category + '\'', function(error, categ_res, fields){
      if(error) throw (error);
      else
        categ_id = categ_res[0].Id;
    });

    db.query('SELECT Id FROM Town WHERE CityName = \'' + city + '\'', function(error, res, fields){
      if(error) throw (error);
      else{
        town_id = res[0].Id
      }
    });

    db.query('SELECT Id FROM Sponsors WHERE Name = \'' + sponsor + '\'', function(error, res, fields){
      if(error) throw (error);
      else{
        sponsor_id = res[0].Id;
      }
    });

    db.query('SELECT Id FROM Countries WHERE Name = \'' + country + '\'', function(error, res, fields){
      if(error) throw (error);
      else{
        country_id = res[0].Id;
      }
    });

    setTimeout(function(){
    db.query('INSERT INTO Events(Name, Description, CategoryId, TownId, SponsorId, CountryId, OrganizerId) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, description, categ_id, town_id, sponsor_id, country_id, req.session.passport.user.user_id], function(error, results, fields){
      if(error) throw (error);
      res.redirect('/eventlist');
    });
  }, 500);
  }
});

//See all the events available, GET Operation
router.get('/eventlist', authenticationMiddleware(), function (req, res, next) {
  console.log(req.session.passport.user.user_id);
  const db = require('../db.js');

  var query1 = "SELECT Events.Id, Events.Name, Events.Description, Events.CategoryId, Events.TownId, Town.CityName FROM Events INNER JOIN Town ON Events.TownId = Town.Id";

  db.query(query1, function(err, result, fields){
    if(err) throw (err);
    else{
      var events = result;
      res.render('eventlist', { events });
    }
  });
});

//DELETE a specific event
router.get('/event_delete/:id', authenticationMiddleware(), function(req, res, next){
  res.render('confirm', {Id: req.params.id});
});

router.get('/event_final_delete/:id', authenticationMiddleware(), function(req, res, next){

  const db = require('../db.js');
  var query = 'DELETE FROM Events WHERE Events.Id =' + req.params.id;
  var query2 = 'DELETE FROM EventParticipants WHERE EventParticipants.EventId = ' + req.params.id;

  db.query(query2, function(error, result, fields){
    if(error) throw (error);
    else{
      db.query(query,function(err, results, field){
        if(err) throw err;
        else{
          res.status(200).render('success');
        }
      })
    };
  });
});

//GET and UPDATE a specific event's details
router.get("/event/:id", authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var query = "SELECT Events.Id, Events.Name as EventName, Events.Description, Countries.Name as Country, Categories.CategName, Town.CityName, Sponsors.Name " +
    "FROM Events " +
    "INNER JOIN Categories ON Categories.Id = Events.CategoryId " +
    "INNER JOIN Town ON Town.Id = Events.TownId " +
    "INNER JOIN Sponsors ON Sponsors.Id = Events.SponsorId " +
    "INNER JOIN Countries ON Countries.Id = Events.CountryId " +
    "WHERE Events.Id = " + req.params.id;

  db.query(query, function(err, result, fields){
    if(err) throw (err);
    else{
      res.status(200).render('edit-event', { event: result[0] });
    }
  });
});

router.post('/edit-event/:id', authenticationMiddleware(), function(req, res, next){
  req.checkBody('name', 'Name field can\'t be empty.').isEmpty();
  req.checkBody('description','Description field can\'t be empty.').isEmpty();
  req.checkBody('category', 'Category field can\'t be empty.').isEmpty();
  req.checkBody('city', 'City field can\'t be empty').isEmpty();
  req.checkBody('sponsor', 'Sponsor field can\'t be empty.').isEmpty();

  const errors = req.validationErrors();
  if(errors){
    res.render('edit-events', {
      title: 'There was an error',
      errors: errors,
    });
  } else {
  
  const name = req.body.eventName;
  const description = req.body.eventDescription;
  const category = req.body.eventCategory;
  const city = req.body.eventCity;
  const sponsor = req.body.eventSponsor;
  const country = req.body.eventCountry;
  const id = req.body.id;

  const db = require('../db.js');

  var categ_id;
  var town_id;
  var sponsor_id;
  var country_id;
  db.query('SELECT Id FROM Categories WHERE CategName = \'' + category + '\'', function(error, categ_res, fields){
    if(error) throw (error);
    else
      categ_id = categ_res[0].Id;
  });

  db.query('SELECT Id FROM Town WHERE CityName = \'' + city + '\'', function(error, res, fields){
    if(error) throw (error);
    else{
      town_id = res[0].Id
    }
  });

  db.query('SELECT Id FROM Sponsors WHERE Name = \'' + sponsor + '\'', function(error, res, fields){
    if(error) throw (error);
    else{
      sponsor_id = res[0].Id;
    }
  });

  db.query('SELECT Id FROM Countries WHERE Name = \'' + country + '\'', function(error, res, fields){
    if(error) throw (error);
    else{
      country_id = res[0].Id;
    }
  });

    setTimeout(function(){
      db.query("UPDATE `Events` SET Name = \'" + name +
      "\', `Description` = \'"  + description +
      "\', `CategoryId` = " + categ_id +
      ", `TownId` = " + town_id+
      ", `SponsorId` = " + sponsor_id + 
      ", `CountryId` = " + country_id +
      " WHERE Id = " + id, function(error, results, fields){
        if(error) throw (error);
        res.redirect('/eventlist');
      });
    }, 700); 
  }
});

//GET an event's details
router.get('/event-detail/:id', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var selectquery = "SELECT Events.Id, Events.Name AS EventName, Events.Description, Categories.CategName, Town.CityName, Sponsors.Name FROM Events INNER JOIN Town ON Town.Id = Events.TownId INNER JOIN Sponsors ON Sponsors.Id = Events.SponsorId INNER JOIN Categories ON Categories.Id = Events.CategoryId WHERE Events.Id = " + req.params.id;

  db.query(selectquery, function(err, result, fields){
    if(err) throw (err);
    else{
      var events = result[0];

      var checkParticipationQuery = "SELECT COUNT(*) AS Partikip FROM EventParticipants WHERE UserId = " + req.session.passport.user.user_id + " AND EventId = " + req.params.id;
      db.query(checkParticipationQuery, function(error, checkres, field){
        if(error) throw (error);
        else{
          var partikip = checkres[0].Partikip;
          res.render('event-detail', { events: events, does: partikip });
        }
      });
    }
  });
});

//follow an event, POSTing in the EventParticipants table
router.post('/event-detail/:id', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var eventid = req.params.id;
  var userid = req.session.passport.user.user_id;

  db.query("INSERT INTO EventParticipants(EventId, UserId) VALUES(?, ?)", [eventid, userid], function(error, results, fields){
    if(error) throw (error);
    else{ 
      res.redirect('/eventlist');
    }
  });
});

//see all the events the logged user followed.
router.get('/my-events', authenticationMiddleware(), function(req, res, next){

  var LastEventYouFollowed = "SELECT Events.Name " +
  "FROM Events " +
  "INNER JOIN EventParticipants ON EventParticipants.EventId = Events.Id " +
  "WHERE EventParticipants.UserId = " + req.session.passport.user.user_id + " " +
  "ORDER BY EventParticipants.Id DESC LIMIT 1";

  var myEventsQuery = "Select Events.Name, Events.Description, Town.CityName, Events.Id " + 
  "FROM Events " +
  "INNER JOIN Town ON Town.Id = Events.TownId " +
  "INNER JOIN EventParticipants ON EventParticipants.EventId = Events.Id " +
  "WHERE EventParticipants.UserId = " + req.session.passport.user.user_id;

  const db = require('../db.js');

  var lastfollow;
  var myevents;

  db.query(LastEventYouFollowed, function(err, result, next){
    if(err) throw err;
    else{
      lastfollow = result[0].Name;
    }
  });

  db.query(myEventsQuery, function(err, resul, next){
    if(err) throw err;
    else{
      myevents = resul;
    }
  });

  setTimeout(function(){
    res.render('my-events', { lastfollow, myevents });
  }, 300)

});
//END OF EVENTS

//POST a city
router.get('/add-city', authenticationMiddleware(), function (req, res, next) {

  res.render('add_town', { title: '' });
});

router.post('/add-city', authenticationMiddleware(), function(req, res, next){

  req.checkBody('city', 'Name field can\'t be empty.').isEmpty();

  const errors = req.validationErrors();
  if(errors){
    res.render('add_town', {
      title: 'There was an error',
      errors: errors,
    });
  } else {
    const city = req.body.cityName;

    const db = require('../db.js');

    db.query('INSERT INTO Town(CityName) VALUES (?)', [city], function(error, results, fields){
      if(error) throw (error);
      else{
        res.redirect('/')
      }
    })
  }
});
//END OF CITIES

//Add a Photo, POSTing in the Pictures table
router.get('/add-photo', authenticationMiddleware(), function(req, res, next){
  res.render('add-photo');
});

router.post('/add-photo', authenticationMiddleware(), function(req, res, next){

  req.checkBody('photoLink', 'Link field can\'t be empty.').notEmpty();
  req.checkBody('photoName', 'Name field can\'t be empty.').notEmpty();
  req.checkBody('photoDesc', 'Description field can\'t be empty.').notEmpty();
  req.checkBody('photoLink', 'Link must have a valid structure.').isURL();

  const errors = req.validationErrors();
  if(errors){
    res.render('add-photo', {title: 'There was an error', errors: errors});
  }
  else {
    const db = require('../db.js');

    const photoLink = req.body.photoLink;
    const photoName = req.body.photoName;
    const photoDescription = req.body.photoDesc;
    const photoProfile = req.body.PhotoProfile;

    db.query('INSERT INTO Pictures(Link, EventName, Description, isProfile) VALUES (?, ?, ?, ?)', [photoLink, photoName, photoDescription, photoProfile], function(err, result, fields){
      if(err) throw (err);
      else{
        res.redirect('/gallery');
      }
    });
  }
});

//GET all photos
router.get('/gallery', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var query = "SELECT Pictures.Id, Pictures.Link, Pictures.EventName, Pictures.Description FROM Pictures WHERE Pictures.IsProfile = 0";

  db.query(query, function(error, result, fields){
    if(error) throw (error);
    else {
      var pics = result;
      res.render('gallery', { pics });
    }
  });
});

//DELETE a specific photo
router.get('/delete-picture/:id', authenticationMiddleware(), function(req, res, next){
  res.render('confirm-picture', {Id: req.params.id});
});

router.get('/picture-final-delete/:id', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var query = "DELETE FROM Pictures WHERE Pictures.Id = " + req.params.id;

  db.query(query, function(error, result, fields){
    if(error) throw (error);
    else{
      res.status(200).render('success');
    }
  });
})

//Edit a specific photo
router.get('/picture/:id', authenticationMiddleware(), function(req, res, next) {
  const db = require('../db.js');

  var query = "SELECT Pictures.Id, Pictures.Link, Pictures.EventName, Pictures.Description " +
    "FROM Pictures " +
    "WHERE Pictures.Id = " + req.params.id;

  db.query(query, function(err, result, fields){
    if(err) throw (err);
    else{
      res.status(200).render('edit-picture', { pic: result[0]});
    }
  });
});

router.post('/picture/:id', authenticationMiddleware(), function(req, res, next){
  req.checkBody('photoLink', 'Link field can\'t be empty.').notEmpty();
  req.checkBody('photoName', 'Name field can\'t be empty.').notEmpty();
  req.checkBody('photoDesc', 'Description field can\'t be empty.').notEmpty();
  req.checkBody('photoLink', 'Link must have a valid structure.').isURL();

  const errors = req.validationErrors();
  if(errors){
    res.render('edit-picture', {title: 'There was an error', errors: errors});
  }
  else {
    const db = require('../db.js');

    const photoLink = req.body.photoLink;
    const photoName = req.body.photoName;
    const photoDescription = req.body.photoDesc;
    const id = req.body.id;

    query = "UPDATE Pictures SET Link = \'" + photoLink +
      "\', EventName = \'" + photoName +
      "\', Description = \'" + photoDescription + "\'" +
      " WHERE Id = " + id;

    db.query(query, function(err, result, fields){
      if(err) throw (err);
      else{
        res.redirect('/gallery');
      }
    });
  }
});

//END OF PHOTOS

//Stats page, completing queries
router.get('/stats', authenticationMiddleware(), function(req, res, next){

  var eventsPerCountry = "SELECT Countries.Name, (SELECT COUNT(*) FROM Events WHERE Events.CountryId = Countries.Id) AS NumberOfEvents FROM Countries";
  var MostPopularEvent = "SELECT eventt.EventName, eventt.EventId " + 
    "FROM(SELECT COUNT(*) AS C, event.Name AS EventName, event.Id AS EventId FROM Events AS event " +
    "INNER JOIN EventParticipants ON event.Id = EventParticipants.EventId " +
    "GROUP BY EventParticipants.EventId ORDER BY C DESC LIMIT 1) AS eventt ";

  var NoOfCategories = "SELECT Categories.CategName, (SELECT COUNT(*) FROM Events WHERE Events.CategoryId = Categories.Id) AS NumberOfEvents FROM Categories";
  var PopularCityName = "SELECT Town.CityName " +
    "FROM(SELECT COUNT(*) AS C, event.TownId AS TownId FROM Events AS event " +
    "INNER JOIN EventParticipants ON event.Id = EventParticipants.EventId " +
    "INNER JOIN Town ON event.TownId = Town.Id " +
    "GROUP BY EventParticipants.EventId ORDER BY C LIMIT 1) AS eventt " +
    "INNER JOIN Town ON eventt.TownId = Town.Id "


    const db = require('../db.js');

    var percountry;
    var mostPopular;
    var participantlist;
    var percategory;
    var populartown;

    db.query(eventsPerCountry, function(err, result, fields){
      if(err) throw (err);
      else{
        percountry = result;
      }
    });
    db.query(MostPopularEvent, function(err, result, fields){
      if(err) throw (err);
      else{
        mostPopular = result[0].EventName;
          var ParticipantsPopularEvent = "SELECT users.firstname " +
          "FROM users " +
          "INNER JOIN EventParticipants ON EventParticipants.UserId = users.id " +
          "WHERE EventParticipants.EventId = " + result[0].EventId;
  
          db.query(ParticipantsPopularEvent, function(err, result, fields){
            if(err) throw (err);
            else{
              participantlist = result;
            }
          });
        }
    });

    db.query(NoOfCategories, function(err, result, fields){
      if(err) throw (err);
      else{
        percategory = result;
      }
    });

    db.query(PopularCityName, function(err, result, fields){
      if(err) throw err;
      else{
        populartown = result[0].CityName;
      }
    })

    setTimeout(function(){
      res.render('stats', { percountry, populartown, mostPopular, participantlist, percategory});
    }, 400);
    
});

  module.exports = router;
