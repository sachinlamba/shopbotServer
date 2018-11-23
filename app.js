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
let serverHost = "c690df0b.ngrok.io";
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

// This responds a POST request for the /view_product page.
app.post('/view_product', function (req, res) {
   console.log("Got a POST request for the /view_product for EAN->", req.body);
   mongodb.MongoClient.connect(uri, (err, mongoclient) => {
     if (err) {
       throw err;
     }
     var db = mongoclient.db(dbName);
     let EanObject = req.body;
     db.collection('productsDataset').find(EanObject).toArray(function(err, items) {
        let product = [...items].length ? [...items][0] : {};
        console.log("product from /view_product",product)
        mongoclient.close();
        res.json(product);
        res.end();
     });
    });
})

app.post('/add_product', function (req, res) {
   console.log("Got a POST request for the /add_product",JSON.stringify(req.body));
   mongodb.MongoClient.connect(uri, (err, mongoclient) => {
     if (err) {
       throw err;
     }
     console.log("6")
     var db = mongoclient.db(dbName);
     console.log("user_update",JSON.stringify(req.body));
     let update_user = req.body;
     let search_user = { email_id: update_user.email_id};
     console.log("search_user", search_user, "cart - ", update_user.productByEAN);
     // res.json(update_user);
     // res.end();
     db.collection('users').findAndModify(
       search_user,
       [],
       {$push: {cart: update_user.productByEAN }},
       {},
       function(err, update_user) {
        console.log("user from /add_product",update_user)
          mongoclient.close();
          res.json(update_user);
          res.end();
     })
    });
})

var server = app.listen(process.env.PORT || 3000, function() {
console.log('API server listening on port: 3000 or ', process.env.PORT)
})

app.post('/shopbotServer', function (req, res){
  // let city = req.body.result.parameters['geo-city']; // city is a required param
  const intentName = req.body.queryResult.intent['displayName'],
        contexts = req.body.queryResult.outputContexts ? req.body.queryResult.outputContexts : [],
        list_type = req.body.queryResult.parameters['list'],
        nthProduct = req.body.queryResult.parameters['nthProduct'],
        noOfProducts = req.body.queryResult.parameters['noOfProducts'] ? req.body.queryResult.parameters['noOfProducts'] : "1";
  let msg = "", contextsObject = {};
  contexts.map(context => {
    let contextName = context.name,
      name = contextName.split("/")[contextName.split("/").length - 1]
    return contextsObject[name] = context;
  })
  console.log("Webhook POST /shopbotServer ----->>> \n\t\tIntent Called -> [", intentName, "]. \n\t\tcontextsObject : " , contextsObject);
  console.log("Request body : ", req.body);
  console.log("Request body originalDetectIntentRequest: ", req.body.originalDetectIntentRequest.payload, req.body.originalDetectIntentRequest.payload.user);
  if(req.body.originalDetectIntentRequest && req.body.originalDetectIntentRequest.payload && req.body.originalDetectIntentRequest.payload.user){
    console.log("Request body user: ", req.body.originalDetectIntentRequest.payload.user.accessToken);
    console.log("string ", JSON.stringify(req.body.originalDetectIntentRequest.payload));
    let linkAccess = "https://www.googleapis.com/oauth2/v1/userinfo?access_token="+req.body.originalDetectIntentRequest.payload.user.accessToken;
    linkAccess += "&userId=" + req.body.originalDetectIntentRequest.payload.user.userId;
    return new Promise(resolve => {
        request({url: linkAccess, method: "GET", json: true},(error, response, body) => {
          console.log("response -> ", response, body);
            if (!error && response.statusCode === 200) {
                let data = JSON.parse(body);
                let name = data.given_name ? data.given_name : '';
                console.log("user details", data, name);
                // conv.ask(new SimpleResponse({
                //     speech: "Hello "+ name + "!",
                //     text: "Hello "+ name + "!"
                // }));
                resolve();
            } else {
                console.log("Error in request promise while trying to fetch email: ",error);
                resolve();
            }
        })
    })
    // new Promise((resolve, reject) => {
    //   let path = '/list_products';
    //   request({
    //             url: "https://" + serverHost + path,
    //             method: "POST",
    //             json: true,   // <--Very important!!!
    //             body: filtersObject
    //           }, function (error, response, body){
    //             if (!error && response.statusCode == 200) {
    //               let response = JSON.stringify(body);
    //               let output = `Product list in MongoDB mLab in cmd : ${response}`;
    //               resolve(response);
    //             }else{
    //               console.error("view products error -> ",error);
    //               reject(error)
    //             }
    //           }
    //         );
    // });
  }
  switch(intentName){
    case "product2Cart":
        console.log("In Intent - product2Cart", contextsObject.login , contextsObject.products_ean_list);
        if(contextsObject.login && contextsObject.login.parameters && contextsObject.login.parameters.email_id != ""){
          let EANNumber = "";
          if(contextsObject["active_product"]){
            //pick this if product details are shown
            EANNumber = contextsObject["active_product"].parameters.EANNumber;
          }else if(contextsObject.products_ean_list && !isNaN(parseFloat(nthProduct)) && isFinite(nthProduct)){
            //;pick this if product number is told by user to add product to cart
            EANNumber = contextsObject.products_ean_list.parameters.EANList[nthProduct-1]
          }else{
            let msg = "Plz view details of product or tell valid index of product(searched list) to add item to your cart.";
            res.setHeader('Content-Type', 'application/json');
            res.json({
                 "fulfillmentText":msg,
                 "fulfillmentMessages":[
                   {
                      "platform": "ACTIONS_ON_GOOGLE",
                      "simpleResponses": {
                        "simpleResponses": [
                          {
                            "textToSpeech": msg
                          }
                        ]
                      }
                    },
                   {
                       "text": {
                           "text": [
                               msg
                           ]
                       }
                   },
                  {
                    "platform": "ACTIONS_ON_GOOGLE",
                    "suggestions": {
                      "suggestions": [
                        {"title": "You can search our Products without login too."}
                      ]
                    }
                  }
                ]
                ,"source":"", 'outputContexts': contextOut
              })
          }
          if(!isNaN(parseFloat(EANNumber)) && isFinite(EANNumber)){
            let userObject = {
              email_id : contextsObject.login.parameters.email_id,
              productByEAN : {
                [EANNumber] : noOfProducts
              }
            };
            addProduct(userObject).then((output) => {
              // Return the results of the weather API to Dialogflow
              console.log("product list by help of EANNumber -> ", output, typeof output)
              output = JSON.parse(output);
              let msg = "Product (EAN number) added successfully. ";
              res.setHeader('Content-Type', 'application/json');
              res.json({
                   "fulfillmentText":msg,
                   "fulfillmentMessages":[
                     {
                        "platform": "ACTIONS_ON_GOOGLE",
                        "simpleResponses": {
                          "simpleResponses": [
                            {
                              "textToSpeech": msg
                            }
                          ]
                        }
                      },
                     {
                         "text": {
                             "text": [
                                 msg
                             ]
                         }
                     },
                    {
                      "platform": "ACTIONS_ON_GOOGLE",
                      "suggestions": {
                        "suggestions": [
                          {"title": "Go back to list?"},
                          {"title": "Add to cart."},
                          {"title": "logout"}
                        ]
                      }
                    }
                  ]
                  ,"source":"", 'outputContexts': contextOut
                })
            }).catch((error) => {
              // If there is an error let the user know
              res.setHeader('Content-Type', 'application/json');
              res.json({
                "fulfillmentText":error,
                "fulfillmentMessages":[
                   {
                       "text": {
                           "text": [
                               error
                           ]
                       }
                   }
                 ]
              });
            });
          }else{
            let msg = "Not able to find a valid productId. Plz try again from a list of products."
            res.setHeader('Content-Type', 'application/json');
            res.json({
              "fulfillmentText":error,
              "fulfillmentMessages":[
                 {
                     "text": {
                         "text": [
                             error
                         ]
                     }
                 }
               ]
            });
          }
        }else{
          let msg = "Plz login to add products to your cart.";
          res.setHeader('Content-Type', 'application/json');
          res.json({
               "fulfillmentText":msg,
               "fulfillmentMessages":[
                 {
                    "platform": "ACTIONS_ON_GOOGLE",
                    "simpleResponses": {
                      "simpleResponses": [
                        {
                          "textToSpeech": msg
                        }
                      ]
                    }
                  },
                 {
                     "text": {
                         "text": [
                             msg
                         ]
                     }
                 },
                {
                  "platform": "ACTIONS_ON_GOOGLE",
                  "suggestions": {
                    "suggestions": [
                      {"title": "You can search our Products without login too."}
                    ]
                  }
                }
              ]
              ,"source":"", 'outputContexts': contextOut
            })
        }

        break;
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
                      "imageUri": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQp8gXe_NmrNfEgvr0aVlZvFjGO3pZ_jPeGclzZGVhK4-eIGYj",
                      "accessibilityText": "Sample Image URL attahced."
                      // "imageUri": product.image_url,
                      // "accessibilityText": "product from category - " + product.category
                    }
                  }

              )
              // }
            })
            console.log("msg and google card1232->", msg, items_card, contexts);
            contextOut = contexts;
            contextOut.push({
              "name": "projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/products_ean_list",
              "lifespanCount": 10,
              "parameters": {
                "EANList": products_ean_list,
                "EANList.original": products_ean_list
              }
            })

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
            let response = "Here we have some tranding products: ";//Default response from the webhook to show it’s working
            let responseObj={
                 "fulfillmentText":response,
                 "fulfillmentMessages":[
                    {
                      "platform": "ACTIONS_ON_GOOGLE",
                      "carouselSelect": {
                        "items": items_card
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
                ,"source":"", 'outputContexts': contextOut
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
            return res.json(responseObj)
        }).catch((error) => {
            // If there is an error let the user know
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
          });
        break
    case "product details":
        console.log("In Intent - product details", contextsObject.products_ean_list);
        let msg = ""
        if(contextsObject.products_ean_list && contextsObject.products_ean_list.parameters && contextsObject.products_ean_list.parameters.EANList != ""){
          // msg = "Logout successfully";
          let EANNumber = contextsObject.products_ean_list.parameters.EANList[nthProduct-1]
          if(!isNaN(parseFloat(EANNumber)) && isFinite(EANNumber)){
            viewProduct(EANNumber).then((output) => {
              // Return the results of the weather API to Dialogflow
              console.log("product list by help of EANNumber -> ", output, typeof output)
              output = JSON.parse(output);
              let msg = "Product Details: \n Name: " + output.Title + "\n" +
                  "Price : " + output.ListPrice + "\n" +
                  "Features : " + output.Feature + "\n" +
                  "Item Dimensions: " + output.ItemDimensions + "\n" +
                  "ReleaseDate: " + output.ReleaseDate + ".\n";
              res.setHeader('Content-Type', 'application/json');
              let contextOut = contexts ? contexts : [];
              contextOut.push({
                                "name": "projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/active_product",
                                "lifespanCount": 10,
                                "parameters": {
                                  "EANNumber": EANNumber
                                }
                              });
            let response = msg; //Default response from the webhook to show it’s working
            let responseObj={
                 "fulfillmentText":"Here is th details of ur selected products.",
                 "fulfillmentMessages":[
                   {
                      "platform": "ACTIONS_ON_GOOGLE",
                      "simpleResponses": {
                        "simpleResponses": [
                          {
                            "textToSpeech": "Here is th details of ur selected products."
                          }
                        ]
                      }
                    },
                   {
                       "text": {
                           "text": [
                               "Here is th details of ur selected products."
                           ]
                       }
                   },
                   {
                    "platform": "ACTIONS_ON_GOOGLE",
                    "basicCard": {
                      "title": output.Title,
                      "subtitle": "Relsease : " + output.ReleaseDate,
                      "formattedText": msg,
                      "image": {
                        "imageUri": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQp8gXe_NmrNfEgvr0aVlZvFjGO3pZ_jPeGclzZGVhK4-eIGYj",
                        "accessibilityText": "Sample Image"
                      },
                      "buttons": [
                        {
                          "title": "Open on website",
                          "openUriAction": {
                            "uri": "http://amazon.com"
                          }
                        }
                      ]
                    }
                  },
                  {
                    "platform": "ACTIONS_ON_GOOGLE",
                    "suggestions": {
                      "suggestions": [
                        {
                          "title": "back to list"
                        },
                        {
                          "title": "Add this to my cart"
                        }
                      ]
                    }
                  }
                ]
                ,"source":"", 'outputContexts': contextOut,
                // "suggestions":
                //   [
                //     {"title": "Go back to list?"},
                //     {"title": "Add to cart."},
                //     {"title": "logout"}
                //   ]
              }
              res.json(responseObj);

            }).catch((error) => {
              // If there is an error let the user know
              res.setHeader('Content-Type', 'application/json');
              res.json({
                "fulfillmentText":error,
                "fulfillmentMessages":[
                   {
                       "text": {
                           "text": [
                               error
                           ]
                       }
                   }
                 ]
              });
            });
          }else{
            res.setHeader('Content-Type', 'application/json');
            msg = "Plz select a valid product number from list only."
            res.json({
              "fulfillmentText":msg,
              "fulfillmentMessages":[
                 {
                     "text": {
                         "text": [
                             msg
                         ]
                     }
                 }
               ]
            });
          }
        }else{
          res.setHeader('Content-Type', 'application/json');
          msg = "Not able to find specified Product from last searched list of products.Say again like - 'open product second'.";
          let responseObj={
               "fulfillmentText":msg,
               "fulfillmentMessages":[
                  {
                      "text": {
                          "text": [
                              msg
                          ]
                      }
                  }
              ]
          }
          res.json(responseObj);
        }
        break;
    default:
      //nonr intents find...
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ 'speech': "Not able to find Switch Case for this Intent",
                                'displayText': "Not able to find Switch Case for this Intent" }));
  }

})


function viewProduct (EANNumber) {
  return new Promise((resolve, reject) => {
    let path = '/view_product';
    console.log("view product", typeof request, typeof http.request, "https://" + serverHost + path);
    console.log("1");
    request({
              url: "https://" + serverHost + path,
              method: "POST",
              json: true,   // <--Very important!!!
              body: {"EAN": EANNumber}
            }, function (error, response, body){
              if (!error && response.statusCode == 200) {
                  console.log("success post request for view product: ",body)
                  resolve(JSON.stringify(body));
              }else{
                console.error("dfg",error);
                reject(error)
              }
            }
          );
  });
}

function addProduct(productObject) {
  return new Promise((resolve, reject) => {
    let path = '/add_product';
    console.log("2. add_product", typeof request, typeof http.request, "https://" + serverHost + path);
    request({
              url: "https://" + serverHost + path,
              method: "POST",
              json: true,   // <--Very important!!!
              body: productObject
            }, function (error, response, body){
              if (!error && response.statusCode == 200) {
                  console.log("success post request for add product to user cart: ",body)
                  resolve(JSON.stringify(body));
              }else{
                console.error("3. add_product",error);
                reject(error)
              }
            }
          );
  });
}

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

// function callProducts (filtersObject) {
//   return new Promise((resolve, reject) => {
//     let path = '/list_products';
//     request({
//               url: "https://products-service.cfapps.io/products/0",
//               method: "GET",
//               json: true//,   // <--Very important!!!
//               //body: filtersObject
//             }, function (error, response, body){
//               if (!error && response.statusCode == 200) {
//                 let response = JSON.stringify(body);
//                 let output = `Product list in MongoDB mLab in cmd : ${response}`;
//                 resolve(response);
//               }else{
//                 console.error("view products error -> ",error);
//                 reject(error)
//               }
//             }
//           );
//   });
// }



// echo "export SENDGRID_API_KEY='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'" > sendgrid.env
// echo "sendgrid.env" >> .gitignore
// source ./sendgrid.env

// npm install --save @sendgrid/mail
//  "@sendgrid/mail": "^6.3.1",

// // using SendGrid's v3 Node.js Library
// // https://github.com/sendgrid/sendgrid-nodejs
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// const msg = {
//   to: 'test@example.com',
//   from: 'test@example.com',
//   subject: 'Sending with SendGrid is Fun',
//   text: 'and easy to do anywhere, even with Node.js',
//   html: '<strong>and easy to do anywhere, even with Node.js</strong>',
// };
// sgMail.send(msg);



