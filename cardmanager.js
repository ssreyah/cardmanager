Cards = new Mongo.Collection("cards");
Scans = new Mongo.Collection("scans"); //history of scanned cards
CardsOnCampus = new Mongo.Collection("cardsoncampus"); //current system state, who is on campus

Meteor.startup(function(){
  var existing_cards = Cards.findOne();
  //if there's no data, please load some test data
  if(!existing_cards){
    var cards = JSON.parse(Assets.getText('fixtures/cards.json'));
    _.each(cards, function(card){
      Cards.insert(card);
    });
  }

});

if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish("cards", function () {
    return Cards.find();
  });
  Meteor.publish("scans", function () {
    return Scans.find();
  });
  Meteor.publish("cardsoncampus", function () {
    return CardsOnCampus.find();
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("cards");
  Meteor.subscribe("scans");
  Meteor.subscribe("cardsoncampus");
  var defaultcard = {
    "name": "Please Scan a Card",
    "barcode": "XXX",
    "associations": ["UNK","UNK","UNK","UNK",
                     "UNK","UNK","UNK","UNK",
                     "UNK","UNK","UNK","UNK"
    ],
    "expires": "XXXX-XX-XX"
  };

  var defaultstatus = {
    class: 'defaultstatus',
    message: 'Welcome to the Logos Card Reader'
  };
  Session.set("currentcard", defaultcard);
  Session.set("currentstatus", defaultstatus);
  Template.body.helpers({
    cards: function () {
      return Cards.find({});
    },
    scans: function () {
      return Scans.find({});
    },
    currentcard: function(){
      return Session.get("currentcard");
    },
    currentstatus: function(){
      return Session.get("currentstatus");
    },
    cardsoncampus: function() {
      return CardsOnCampus.find({});
    },
    cardsoncampuscount: function() {
      return CardsOnCampus.find().count();
    },
    recentscans: function() {
      return Scans.find({},{sort: {scannedAt : -1},limit: 10});
    }
  });

  Template.body.events({
    //manually kick people off campus by clicking their photos
    "click .miniphoto": function (e) {
      e.preventDefault();
      bc = e.currentTarget.id;
      console.log("you clicked "+e.currentTarget.id);
      card = CardsOnCampus.findOne({
        barcode: bc
      });

      CardsOnCampus.remove(card._id);
      //and log it.
      Scans.insert({
        card: bc,
        scannedAt: new Date(), // current time
        action: "Admin Override (Exit)",
        value: 0.00
      });

    },
    //check people in and out by scanning their card
    "submit .new-scan": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      card = Cards.findOne({
        barcode: text
      });


      if(card == null){
        card =
            {
            	"name": "Card Not Found!",
            	"barcode": "NA",
            	"associations": ["NA","NA","NA","NA",
                               "NA","NA","NA","NA",
                               "NA","NA","NA","NA"
            	],
            	"expires": "XXXX-XX-XX"
            };
        denied = {
          class: 'exit',
          message: 'Access Denied'
        };
        Session.set("currentstatus",denied)
      }
      //otherwise let's see if they're coming or going.
      else{
        var entering = {
          class: 'enter',
          message: 'Entering'
        };
        var exiting = {
          class: 'exit',
          message: 'Exiting'
        };
        //handle enter/exit status

        cardstatus = CardsOnCampus.findOne({
          barcode: text
        });



        //not found, must be entering
        if(cardstatus == null){
          card['timestamp'] = new Date(); //insert timestamp
          CardsOnCampus.insert(card);
          Session.set("currentstatus",entering);

        }
        else{

          CardsOnCampus.remove(cardstatus._id);
          Session.set("currentstatus",exiting);

        }
      }

      Session.set("currentcard", card);

      // Insert a scan into the collection
      Scans.insert({
        card: text,
        scannedAt: new Date(), // current time
        action: Session.get("currentstatus").message,
        value: 0.00
      });


      // Clear form
      event.target.text.value = "";
    }

  });

  Template.card.helpers({

  });

  Template.card.events({

  });
  //handle dates with momentjs
  Template.registerHelper('formatDate', function(date) {
    if(date)
      return moment(date).format('MMM Do HH:mm');
    else
      return null;
});

  Template.registerHelper('since', function(date) {
    if(date != null)
      return moment(date).fromNow();
    else
      return null;
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

}

Meteor.methods({
  getCard: function(text){
    card = Cards.findOne({
      cardnumber: text,
      barcode: {$regex: /first/}
    });
    console.log(text);
    if(card == null){
      card =
          {
          	"name": "Card Not Found!",
          	"barcode": "XXX",
          	"associations": [
          	],
          	"expires": "XXXX-XX-XX"
          };
    }
    console.log("returning: "+card.name)
    Session.set("currentcard", card);
  }
});
