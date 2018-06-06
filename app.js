var express = require('express')
var bodyParser = require('body-parser')
const mongodb = require('mongodb');
const nconf = require('nconf');
const http = require('http');
var request = require('request');

var app = express();
app.use(bodyParser.json());
nconf.argv().env().file('keys.json');

const user = nconf.get('mongoUser');
const pass = nconf.get('mongoPass');
const host = nconf.get('mongoHost');
const port = nconf.get('mongoPort');
const dbName = nconf.get('mongoDatabase');
let serverHost = "445ff724.ngrok.io";
if(process.env.PORT){//if webhook and app is runnig on heroku..
  serverHost = "shopbot-server.herokuapp.com";
}

let uri = `mongodb://${user}:${pass}@${host}:${port}`;
if (nconf.get('mongoDatabase')) {
  uri = `${uri}/${nconf.get('mongoDatabase')}`;
}
console.log("mongo url", uri);

// This responds with "Hello" on the homepage
app.get('/', function (req, res) {
   console.log("Got a GET request for the homepage");
   res.end('Hello from Home Page');
});
app.post('/list_products', function (req, res) {
   console.log("Got a POST request for /list_products");
   mongodb.MongoClient.connect(uri, (err, mongoclient) => {
     if (err) {
       throw err;
     }
     var db = mongoclient.db(dbName);
     let products = [];
     db.collection('productsDataset').find().limit(10).toArray(function(err, items) {
        products = [...items]
        console.log("products from /productsList",products)
        mongoclient.close();
        res.json(products);
        res.end();
     });
    });
})

var server = app.listen(process.env.PORT || 3000, function() {
console.log('API server listening on port: 3000 or ', process.env.PORT)
})

app.post('/shopbotServer', function (req, res){
//   let response = "This is a sample response from your webhook!";//Default response from the webhook to show it’s working
// let responseObj={
//      "fulfillmentText":response
//     ,"fulfillmentMessages":[
//         {
//             "text": {
//                 "text": [
//                     "Hello I m Responding to intent"
//                 ]
//             }
//         }
//     ]
//     ,"source":""
// }
// return res.json(responseObj);
// })
// app.post('/shopbotServer11', function (req, res){
  // let city = req.body.result.parameters['geo-city']; // city is a required param
  const intentName = req.body.queryResult.intent['displayName'],
        contexts = req.body.queryResult.outputContexts ? req.body.queryResult.outputContexts : [],
        list_type = req.body.queryResult.parameters['list'],
        nthProduct = req.body.queryResult.parameters['nthProduct'],
        noOfProducts = req.body.queryResult.parameters['noOfProducts'] ? req.body.queryResult.parameters['noOfProducts'] : "1";
  let msg = "", contextsObject = {};
  contexts.map(context => {
    return contextsObject[context.name] = context;
  })
  console.log("Webhook POST /shopbotServer ----->>> \n\t\tIntent Called -> [", intentName, "]. \n\t\tcontextsObject : " , contextsObject);
  console.log("Request body : ", req.body);
  switch(intentName){
    case "product-list":
          callProducts().then((output) => {
            // Return the results of the weather API to Dialogflow
            let msg = "Products List :\n";
            console.log("products list here", output, typeof output);
            output = JSON.parse(output);
            let contextOut = [],
                products_ean_list = [];
            items_card = [];
            output.forEach((product, ind) => {
              let index = ind + 1;
              // if(items_card.length < 10){
              products_ean_list.push(product.EAN);
              msg += "["+index + "]. " + product.Title + "\n" +
                      // "Description : " + product.description + "\n" +
                      "Price: " + product.ListPrice;
              // if(product.deals.isDeal){
              //   msg += "We also have a discount on this product."
              // }
              msg += "\n\n";
                items_card.push(
                  {
                    "info": {
                      "key": String(index)
                    },
                    "title": product.Title,
                    "description": "Price: "+ product.ListPrice,
                    "image": {
                      "imageUri": "http:example.com",
                      "accessibilityText": "example"
                    }
                  }
                  // {
                  //   "description": "Price: "+ product.ListPrice,
                  //   // "image": {
                  //   //   "url": product.image_url,
                  //   //   "accessibilityText": "product from category - " + product.category
                  //   // },
                  //   "optionInfo": {
                  //     "key": String(index),
                  //     "synonyms": [
                  //       "thing " + String(index),
                  //       "object " + String(index)
                  //     ]
                  //   },
                  //   "title": product.Title
                  // }
              )
              // }
            })
            console.log("msg and google card1232->", msg, items_card, contexts);
            contextOut = contexts;
            contextOut.push({
              "name": "products_ean_list",
              "lifespan": 10,
              "parameters": {
                "EANList": products_ean_list
              }
            })
            // items_card.unshift({
            //   "simpleResponse": {
            //     "textToSpeech": "this is a simple product response for google"
            //   }
            // })
            res.setHeader('Content-Type', 'application/json');
            //done send data more than 640bytes(i think) else googlle assistent crash..
            // res.send(JSON.stringify({ 'speech': msg, 'displayText': msg, 'contextOut': contextOut,
            //                         "messages": [
            //                           {
            //                             "items": items_card,
            //                             "platform": "google",
            //                             "type": "carousel_card"
            //                           }
            //                         ]
            //                      }));
            let response = "This is a sample response from your webhook!";//Default response from the webhook to show it’s working
            let responseObj={
                 "fulfillmentText":response
                ,"fulfillmentMessages":[
                  {
        "platform": "ACTIONS_ON_GOOGLE",
        "carouselSelect": {
          "items": items_card
          // [
          //   {
          //     "info": {
          //       "key": "1"
          //     },
          //     "title": "example1 carousel1111",
          //     "description": "example1 carousel list",
          //     "image": {
          //       "imageUri": "http:example.com",
          //       "accessibilityText": "example"
          //     }
          //   },
          //   {
          //     "info": {
          //       "key": "2"
          //     },
          //     "title": "example1 carousel22222",
          //     "description": "example1 carousel list 2",
          //     "image": {
          //       "imageUri": "http:example.com",
          //       "accessibilityText": "example2"
          //     }
          //   }
          // ]
        }
      },
                    {
                        "text": {
                            "text": [
                                "Hello I m Responding to intent"
                            ]
                        }
                    }
                ]
                ,"source":""
                  // "payload": {
                  //   "google": {
                  //     "expectUserResponse": true,
                  //     "richResponse": {
                  //       "items"://items_card
                  //       [
                  //         {
                  //           "simpleResponse": {
                  //             "textToSpeech": "this is a simple product response for google"
                  //           }
                  //         },
                  //       ]
                  //     }
                  //   }
                  // }
            }
            return res.json(responseObj
              // JSON.stringify(
              // {//'speech': msg, 'displayText': msg,
              // "speech": "product list here", "displayText": "product list here",
              //   "fulfillmentText": "This is a text response",
              //   "fulfillmentMessages": [
              //     {
              //       "card": {
              //         "title": "card title",
              //         "subtitle": "card text",
              //         "imageUri": "https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png",
              //         "buttons": [
              //           {
              //             "text": "button text",
              //             "postback": "https://assistant.google.com/"
              //           }
              //         ]
              //       }
              //     }
              //   ],
              //   "source": "example.com",
              //   "payload": {
              //     "google": {
              //       "expectUserResponse": true,
              //       "richResponse": {
              //         "items": [
              //           {
              //             "simpleResponse": {
              //               "textToSpeech": "this is a simple response"
              //             }
              //           }
              //         ]
              //       }
              //     },
              //     "facebook": {
              //       "text": "Hello, Facebook!"
              //     },
              //     "slack": {
              //       "text": "This is a text response for Slack."
              //     }
              //   },
              //   "outputContexts": [
              //     {
              //       "name": "projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/context name",
              //       "lifespanCount": 5,
              //       "parameters": {
              //         "param": "param value"
              //       }
              //     }
              //   ],
              //   "followupEventInput": {
              //     // "name": "event name",
              //     // "languageCode": "en-US",
              //     // "parameters": {
              //     //   "param": "param value"
              //     // }
              //   }
              // }
            // )
            )

        }).catch((error) => {
            // If there is an error let the user know
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
          });
        break
    default:
      //nonr intents find...
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ 'speech': "Not able to find Switch Case for this Intent",
                                'displayText': "Not able to find Switch Case for this Intent" }));
  }

})

function callProducts (filtersObject) {
  return new Promise((resolve, reject) => {
    let path = '/list_products';
    request({
              url: "https://" + serverHost + path,
              method: "POST",
              json: true,   // <--Very important!!!
              body: filtersObject
            }, function (error, response, body){
              if (!error && response.statusCode == 200) {
                let response = JSON.stringify(body);
                let output = `Product list in MongoDB mLab in cmd : ${response}`;
                resolve(response);
              }else{
                console.error("view products error -> ",error);
                reject(error)
              }
            }
          );
  });
}
