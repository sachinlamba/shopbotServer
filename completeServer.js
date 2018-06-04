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
let serverHost = "7f75b643.ngrok.io";
if(process.env.PORT){//if webhook and app is runnig on heroku..
  serverHost = "maker-lab.herokuapp.com";
}

let userSchema = {
    "_id": "",
    "first_name": "",
    "last_name": "",
    "password": "",
    "role": {
        "customer": false
    },
    "cart": [],
    "buy_history_product": [],
    "buckets_created": {},
    "address": {},
    "products_id_search_history": []
};

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
// This responds a GET request for the /list_products page.
app.get('/chatFirstSpeak', function (req, res) {
   console.log("Got a GET request for the /chatFirstSpeak");
   request({
             url: "https://console.dialogflow.com/api-client/demo/embedded/b391e62e-588b-48a0-b250-25690d5b8c41/demoQuery?q=hi&sessionId=f8ef1b94-0e7d-adeb-3f20-5681e042c1d1",
             method: "GET",
             Options: {
               "Access-Control-Allow-Origin": "*",
               "Access-Control-Allow-Headers": "Content-Type"
             }
           }, function (error, response, body){
             if (!error && response.statusCode == 200) {
                 console.log("success get chatFirstSpeak: ",body)
                 res.json(body);
                 res.end();
             }else{
               console.error("chatFirstSpeak",error);
             }
           }
         );
        // res.json(products);
        // res.end();
})
app.get('/list_products', function (req, res) {
   console.log("Got a GET request for the /list_products");
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

app.post('/user_login', function (req, res) {
   console.log("Got a GET request for the /user_login", req.body);
   mongodb.MongoClient.connect(uri, (err, mongoclient) => {
     if (err) {
       throw err;
     }
     var db = mongoclient.db(dbName);
     let users = req.body;
     db.collection('users').find(users).toArray(function(err, items) {
        users = [...items]
        console.log("users from /user_login",users)
        mongoclient.close();
        res.json(users);
        res.end();
     });
    });
})

app.get('/create_user', function (req, res) {
   console.log("Got a GET request for the /create_user");
   mongodb.MongoClient.connect(uri, (err, mongoclient) => {
     if (err) {
       throw err;
     }
     var db = mongoclient.db(dbName);
     let create_user = {name: "sachin", mobile: 9999278030};
     db.collection('users').insert(create_user, {w: 1}, function(err, user){
       console.log("user added", create_user, user)
     })
    });
})

app.post('/user_update', function (req, res) {
   console.log("Got a POST request for the /user_update",JSON.stringify(req.body));
   mongodb.MongoClient.connect(uri, (err, mongoclient) => {
     if (err) {
       throw err;
     }
     console.log("6")
     var db = mongoclient.db(dbName);
     console.log("user_update",JSON.stringify(req.body));
     let update_user = req.body;
     let search_user = { email_id: update_user.email_id};
     console.log("update_user", update_user);
     // res.json(update_user);
     // res.end();
     db.collection('users').find(search_user).toArray(function(err, items) {
        console.log("user from /user_update",items)
        db.collection('users').updateOne(search_user, {$set : update_user}, function(err, user){
          console.log("user updated - ", update_user)
          // console.log("user updated return - ", user)--> it is retunrnig a object of all detials.Socket etc..
          mongoclient.close();
          res.json(update_user);
          res.end();
        })
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

app.post('/create_user', function (req, res) {
   console.log("Got a POST request for the /create_user",JSON.stringify(req.body));
   mongodb.MongoClient.connect(uri, (err, mongoclient) => {
     if (err) {
       throw err;
     }
     console.log("6")
     var db = mongoclient.db(dbName);
     console.log("create_user1",JSON.stringify(req.body));
     let create_user = {
         "first_name": "",
         "last_name": "",
         "password": req.body.password,
         "email_id": req.body.email_id,
         "user_name": "",
         "role": {
             "customer": true
         },
         "cart": [],
         "buy_history_product": [],
         "buckets_created": {},
         "address": {},
         "products_id_search_history": []
     };

     db.collection('users').insert(create_user, {w: 1}, function(err, user){
       console.log("user added - ", create_user)
       console.log("user added details", user)
       mongoclient.close();
       res.json(create_user);
       res.end();
     })
    });
})

var server = app.listen(process.env.PORT || 3000, function() {
console.log('API server listening on port: 3000 or ', process.env.PORT)
})

app.post('/makerLab', function (req, res){
  // let city = req.body.result.parameters['geo-city']; // city is a required param
  const intentName = req.body.result.metadata['intentName'],
        contexts = req.body.result.contexts ? req.body.result.contexts : [],
        list_type = req.body.result.parameters['list'],
        nthProduct = req.body.result.parameters['nthProduct'],
        noOfProducts = req.body.result.parameters['noOfProducts'] ? req.body.result.parameters['noOfProducts'] : "1";
  let msg = "", contextsObject = {};
  contexts.map(context => {
    return contextsObject[context.name] = context;
  })
  console.log("Webhook POST /makerLab ----->>> \n\t\tIntent Called -> [", intentName, "]. \n\t\tcontextsObject : " , contextsObject);
  console.log("Request body : ", req.body);
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
            res.send(JSON.stringify({ 'speech': msg, 'displayText': msg,
                              data: {
                                        "google": {
                                            "expect_user_response": true,
                                            "rich_response": {
                                              "items": [
                                                  {
                                                    "simpleResponse": {
                                                      "textToSpeech": msg,
                                                      "displayText": msg
                                                    }
                                                  }
                                              ],
                                              "suggestions":
                                                [
                                                  {"title": "You can search our Products without login too."}
                                                ]
                                          }
                                        }
                                    }
                                  }));
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
              res.send(JSON.stringify({ 'speech': msg, 'displayText': msg,
                                data: {
                                          "google": {
                                              "expect_user_response": true,
                                              "rich_response": {
                                                "items": [
                                                    {
                                                      "simpleResponse": {
                                                        "textToSpeech": msg,
                                                        "displayText": msg
                                                      }
                                                    }
                                                ],
                                                "suggestions":
                                                  [
                                                    {"title": "Go back to list?"},
                                                    {"title": "Add to cart."},
                                                    {"title": "logout"}
                                                  ]
                                            }
                                          }
                                      }
                                    }));
            }).catch((error) => {
              // If there is an error let the user know
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
            });
          }else{
            let msg = "Not able to find a valid productId. Plz try again from a list of products."
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
          }
        }else{
          let msg = "Plz login to add products to your cart.";
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ 'speech': msg, 'displayText': msg,
                            data: {
                                      "google": {
                                          "expect_user_response": true,
                                          "rich_response": {
                                            "items": [
                                                {
                                                  "simpleResponse": {
                                                    "textToSpeech": msg,
                                                    "displayText": msg
                                                  }
                                                }
                                            ],
                                            "suggestions":
                                              [
                                                {"title": "You can search our Products without login too."}
                                              ]
                                        }
                                      }
                                  }
                                }));
        }

        break;
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
                                "name": "active_product",
                                "lifespan": 10,
                                "parameters": {
                                  "EANNumber": EANNumber
                                }
                              });
              res.send(JSON.stringify({ 'speech': msg, 'displayText': msg,
                                contextOut: contextOut,
                                data: {
                                          "google": {
                                              "expect_user_response": true,
                                              "rich_response": {
                                                "items": [
                                                    {
                                                      "simpleResponse": {
                                                        "textToSpeech": msg,
                                                        "displayText": msg
                                                      }
                                                    }
                                                ],
                                                "suggestions":
                                                  [
                                                    {"title": "Go back to list?"},
                                                    {"title": "Add to cart."},
                                                    {"title": "logout"}
                                                  ]
                                            }
                                          }
                                      }
                                    }));
            }).catch((error) => {
              // If there is an error let the user know
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
            });
          }else{
            res.setHeader('Content-Type', 'application/json');
            msg = "Plz select a valid product number from list only."
            res.send(JSON.stringify({ 'speech': msg, 'displayText': msg }));
          }
        }else{
          res.setHeader('Content-Type', 'application/json');
          msg = "Not able to find specified Product from last searched list of products.Say again like - 'open product second'.";
          res.send(JSON.stringify({ 'speech': msg, 'displayText': msg }));
        }
        break;
    case "update user details":
        console.log("In Intent - update user details -> ", contextsObject.login)
        msg = "";
        if(contextsObject.login && contextsObject.login.parameters && contextsObject.login.parameters.email_id != ""){
          let updateUserDetails = {
            email_id: contextsObject.login.parameters.email_id,
            [req.body.result.parameters['user_parameter']]: req.body.result.parameters['user_value']
          };
          updateUser(updateUserDetails).then((output) => {
            // Return the results of the weather API to Dialogflow
            console.log("logged-in users udpated details -> ", output, typeof output)
            output = JSON.parse(output);
            let msg = "Update successfully for " + output.email_id + ".";
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ 'speech': msg, 'displayText': msg,
                              data: {
                                        "google": {
                                            "expect_user_response": true,
                                            "rich_response": {
                                              "items": [
                                                  {
                                                    "simpleResponse": {
                                                      "textToSpeech": msg,
                                                      "displayText": msg
                                                    }
                                                  }
                                              ],
                                              "suggestions":
                                                [
                                                  {"title": "Want to logout?"},
                                                  {"title": "update phone Number/address/age/name etc."},
                                                  {"title": "UPda"}
                                                ]
                                          }
                                        }
                                    }
                                  }));
          }).catch((error) => {
            // If there is an error let the user know
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
          });
        }else{
          msg = "Plz login to update profile.";
          contextOut = [
                          {
                            "name": "login",
                            "lifespan": 0,
                            "parameters": {
                              "email_id": ""
                            }
                          }
                        ];
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ 'speech': msg, 'displayText': msg, "contextOut": contextOut,resetContexts : true,
                            data: {
                                      "google": {
                                          "expect_user_response": true,
                                          "rich_response": {
                                            "items": [
                                                {
                                                  "simpleResponse": {
                                                    "textToSpeech": msg,
                                                    "displayText": msg
                                                  }
                                                }
                                            ],
                                            "suggestions":
                                              [
                                                {"title": "You can search our Products without login too."}
                                              ]
                                        }
                                      }
                                  }
                                }));
        }
        break;
    case "logout user":
        // Return the results of the weather API to Dialogflow
        console.log("logged-out user details -> ", contextsObject.login)
        msg = "Plz login to do logout from this app.";
        let contextOut = [];
        if(contextsObject.login && contextsObject.login.parameters && contextsObject.login.parameters.email_id != ""){
          msg = "Logout successfully";
          contextOut = [
                          {
                            "name": "login",
                            "lifespan": 0,
                            "parameters": {
                              "email_id": ""
                            }
                          }
                        ];
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ 'speech': msg, 'displayText': msg, "contextOut": contextOut,resetContexts : true,
                          data: {
                                    "google": {
                                        "expect_user_response": true,
                                        "rich_response": {
                                          "items": [
                                              {
                                                "simpleResponse": {
                                                  "textToSpeech": msg,
                                                  "displayText": msg
                                                }
                                              }
                                          ],
                                          "suggestions":
                                            [
                                              {"title": "Want to Login Again?"},
                                              {"title": "You can search our Products without login too."}
                                            ]
                                      }
                                    }
                                }
                              })
                );
        break;
    case "login user":
        let checkUser = {
          email_id: req.body.result.parameters['email_id'],
          password: req.body.result.parameters['password']
        };
        loginUser(checkUser).then((output) => {
          // Return the results of the weather API to Dialogflow
          console.log("logged-in user details -> ", output, typeof output)
          let msg = "";
          output = JSON.parse(output);
          let contextOut = contexts ? contexts : [];
          if(!output.length){
            msg = "Details are not correct. plz say like - login me by *******@gmail.com and *****"
          } else if(output.length > 0 && output[0].role.customer){
            contextOut = contexts;
            contextOut.push({
                              "name": "login",
                              "lifespan": 50,
                              "parameters": {
                                "email_id": output[0].email_id
                              }
                            });
            msg = "You are successfully logged in as Customer"
          }else{
            //TODO: update for vendor n cpg..
            msg = "You are successfully logged in as Vendor"
          }
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ 'speech': msg, 'displayText': msg, "contextOut": contextOut,
                            data: {
                                      "google": {
                                          "expect_user_response": true,
                                          "rich_response": {
                                            "items": [
                                                {
                                                  "simpleResponse": {
                                                    "textToSpeech": msg,
                                                    "displayText": msg
                                                  }
                                                }
                                            ],
                                            "suggestions":
                                              [
                                                {"title": output.length ? "Create Bucket" : "Not signup till now? Want to SignUp.."},
                                                {"title": output.length ? "Update Profile" : "Try again to login, if registerd already"},
                                                {"title":output.length ? "Search Products" : "You can search our Products without login too."}
                                              ]
                                        }
                                      }
                                  }
                                }));
        }).catch((error) => {
          // If there is an error let the user know
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
        });
        break;
    case "create user":
        let new_user = {
          email_id: req.body.result.parameters['email_id'],
          password: req.body.result.parameters['password']
        };
        createUser(new_user).then((output) => {
          // Return the results of the weather API to Dialogflow
          let msg = "Registation unsuccessful";
          output = JSON.parse(output);
          let contextOut = [];
          if(Object.keys(output).length){
            msg = "Registation successful."
          }
          console.log("create user -> ", output, typeof output)
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ 'speech': msg, 'displayText': msg }));
        }).catch((error) => {
          // If there is an error let the user know
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
        });
        break;
    case "type-list":
        if(list_type == "products"){
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
                    "description": "Price: "+ product.ListPrice,
                    // "image": {
                    //   "url": product.image_url,
                    //   "accessibilityText": "product from category - " + product.category
                    // },
                    "optionInfo": {
                      "key": String(index),
                      "synonyms": [
                        "thing " + String(index),
                        "object " + String(index)
                      ]
                    },
                    "title": product.Title
                  }
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
            res.setHeader('Content-Type', 'application/json');
            //done send data more than 640bytes(i think) else googlle assistent crash..
            res.send(JSON.stringify({ 'speech': msg, 'displayText': msg, 'contextOut': contextOut,
                                    "messages": [
                                      {
                                        "items": items_card,
                                        "platform": "google",
                                        "type": "carousel_card"
                                      }
                                    ]
                                 }));

        }).catch((error) => {
            // If there is an error let the user know
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
          });
        }
        break
    default:
      //nonr intents find...
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ 'speech': "Not able to find Switch Case for this Intent",
                                'displayText': "Not able to find Switch Case for this Intent" }));
  }
  // if(intentName == "update user details"){
  //
  // }else if(intentName == "logout user"){
  //
  // }else if(intentName == "login user"){
  //
  // }else if(intentName == "create user"){
  //
  // }else if(list_type == "products"){
  //
  //   }
})
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

function updateUser(userObject) {
  return new Promise((resolve, reject) => {
    let path = '/user_update';
    console.log("2. user_update", typeof request, typeof http.request, "https://" + serverHost + path);
    request({
              url: "https://" + serverHost + path,
              method: "POST",
              json: true,   // <--Very important!!!
              body: userObject
            }, function (error, response, body){
              if (!error && response.statusCode == 200) {
                  console.log("success post request for user details update: ",body)
                  resolve(JSON.stringify(body));
              }else{
                console.error("3. user_update",error);
                reject(error)
              }
            }
          );
  });
}

function loginUser(userObject) {
  return new Promise((resolve, reject) => {
    let path = '/user_login';
    console.log("2. user_login", typeof request, typeof http.request, "https://" + serverHost + path);
    request({
              url: "https://" + serverHost + path,
              method: "POST",
              json: true,   // <--Very important!!!
              body: userObject
            }, function (error, response, body){
              if (!error && response.statusCode == 200) {
                  console.log("success post request for user login: ",body)
                  resolve(JSON.stringify(body));
              }else{
                console.error("3. user_login",error);
                reject(error)
              }
            }
          );
  });
}

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

function createUser (userObject) {
  return new Promise((resolve, reject) => {
    let path = '/create_user';
    console.log("sdf", typeof request, typeof http.request, "https://" + serverHost + path);
    let bodyString = JSON.stringify({a:"b"})
    // resolve(bodyString);
    console.log("1");
    request({
              url: "https://" + serverHost + path,
              method: "POST",
              json: true,   // <--Very important!!!
              body: userObject
            }, function (error, response, body){
              if (!error && response.statusCode == 200) {
                  console.log("success post request for insertion: ",body)
                  resolve(JSON.stringify(body));
              }else{
                console.error("dfg",error);
                reject(error)
              }
            }
          );
  });
}

function callProducts () {
  return new Promise((resolve, reject) => {
    let path = '/list_products';
    http.get({host: serverHost, path: path}, (res) => {
      let body = ''; // var to store the response chunks
      res.on('data', (d) => { body += d; }); // store each response chunk
      res.on('end', () => {
        // After all the data has been received parse the JSON for desired data
        let response = JSON.parse(body);
        // Create response
        let a = JSON.stringify(response)
        let output = `Product list in MongoDB mLab ${a}`;
        // response.forEach(function (product, i) {
        //   output += i + " " product.name + " \n"
        // })
        // Resolve the promise with the output text
        console.log(body);
        resolve(body);
      });
      res.on('error', (error) => {
        reject(error);
      });
    });
  });
}
function callUsers () {
  return new Promise((resolve, reject) => {
    let path = '/create_user1';
    http.get({host: serverHost, path: path}, (res) => {
      let body = ''; // var to store the response chunks
      res.on('data', (d) => { body += d; }); // store each response chunk
      res.on('end', () => {
        // After all the data has been received parse the JSON for desired data
        let response = JSON.parse(body);
        // Create response
        let a = JSON.stringify(response)
        let output = `Users list in MongoDB mLab ${a}`;
        console.log(output);
        resolve(output);
      });
      res.on('error', (error) => {
        reject(error);
      });
    });
  });
}
