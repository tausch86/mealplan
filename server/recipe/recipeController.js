var Promise = require('bluebird');
var http = require('http');
var Recipe = require('./recipeModel');
var RecipePreference = require('../recipePreference/recipePreferenceModel');
var db = require('../db');
var lib = require('../config/libraries');
var MealPlan = require('../mealPlan/mealPlanModel');
var utils = require('../config/utility');

var appId, apiKey;
try {
  appId = process.env.APPLICATION_ID || require('../config/config.js').APPLICATION_ID;
  apiKey = process.env.APPLICATION_KEY || require('../config/config.js').APPLICATION_KEY;
} 
catch (e) {
  appId = 12345;
  apiKey = 98765;
}

var writeQueries = function(queryModel){
  var allowedAllergyList = queryModel.allowedAllergy;
  var allowedCuisineList = queryModel.allowedCuisine;
  var allowedDietList = queryModel.allowedDiet;

  //handling stringified number values from client so as to not concatenate 10 
  queryModel.numBreakfasts *= 1;
  queryModel.numLunches *= 1;
  queryModel.numDinners *= 1;

  // If number of course meals specified, add 10 meals for queueing functionality
  var numBreakfasts = queryModel.numBreakfasts && queryModel.numBreakfasts + 10;
  var numLunches =  queryModel.numLunches && queryModel.numLunches + 10;
  var numDinners =  queryModel.numDinners && queryModel.numDinners + 10;


  //will likely have to track additional requests for each course
  var start = queryModel.additionalRequest ? queryModel.totalRecipesRequested : 0;

  var breakfastQueryString, lunchQueryString, dinnerQueryString;
  var queryString = '';

  // add each allowed allergy/cuisine/diet to query string
  for (var key in allowedAllergyList) {
    if (allowedAllergyList[key]) {
      queryString += "&allowedAllergy[]" + "=" + lib.allowedAllergyLibrary[key];
    }
  }
  for (key in allowedCuisineList) {
    if (allowedCuisineList[key]) {
      queryString += "&allowedCuisine[]" + "=" + lib.allowedCuisineLibrary[key];
    }
  }
  for (key in allowedDietList) {
    if (allowedDietList[key]) {
      queryString += "&allowedDiet[]" +  "=" + lib.allowedDietLibrary[key];
    }
  }

  breakfastQueryString = numBreakfasts > 0 ?
    "http://api.yummly.com/v1/api/recipes?_app_id=" + appId +
    "&_app_key=" + apiKey +
    queryString + "&allowedCourse[]=" + lib.course.Breakfast + "&requirePictures=true" +
    "&maxResult=" + numBreakfasts + "&start=" + start : "";

  lunchQueryString = numLunches > 0 ?
    "http://api.yummly.com/v1/api/recipes?_app_id=" + appId +
    "&_app_key=" + apiKey +
    queryString + "&allowedCourse[]=" + lib.course.Lunch + "&requirePictures=true" +
    "&maxResult=" + numLunches + "&start=" + start : "";

  dinnerQueryString = numDinners > 0 ?
    "http://api.yummly.com/v1/api/recipes?_app_id=" + appId +
    "&_app_key=" + apiKey +
    queryString + "&allowedCourse[]=" + lib.course.Dinner + "&requirePictures=true" +
    "&maxResult=" + numDinners + "&start=" + start : "";

  return {
    'breakfastQuery': breakfastQueryString,
    'lunchQuery': lunchQueryString,
    'dinnerQuery': dinnerQueryString
  };
};

var queryYummly = function(queryString){

  return new Promise(function(resolve, reject){
    var results;
    //no meals entered for param; query is empty string
    if(!queryString){
      console.log('hello error query');
      resolve([]);
    } else{

      http.get(queryString, function(yummlyResponse){
        var str = '';

        yummlyResponse.on('data', function (chunk) {
          str += chunk;
        });

        yummlyResponse.on('end', function () {
          results = JSON.parse(str);
          resolve(results.matches);

        });
        yummlyResponse.on('error', function(error){
          reject(error);

        })
      });
    }
  });
};

var getToYummly = function (recipeId) {
  console.log('in get to yummly');
  return new Promise(function(resolve, reject){
    var str = "";
    var recipe;

    var query = "http://api.yummly.com/v1/api/recipe/" + recipeId +
    "?_app_id=" + appId + "&_app_key=" + apiKey;

    http.get(query, function(yummlyResponse) {

      yummlyResponse.on('data', function (chunk) {
        str += chunk;
      });

      yummlyResponse.on('end', function () {
        recipe = JSON.parse(str);

        resolve(recipe)
      });

      yummlyResponse.on('error', function(error) {
        reject({'error in getToYummly': error});
      });
    });
  });
}
//takes an array of recipe ids and will make individual get requests from yummly
var getArrayFromYummly = function(recipes){
  return new Promise(function(resolve, reject){
    var promises = [];
    for(var i = 0; i < recipes.length; i++){
      promises.push(getToYummly(recipes[i]));
    }

    Promise.all(promises)
    .then(function(fetchedRecipes){
      resolve(fetchedRecipes);
    })
    .catch(function(error){
      reject({'error in getArrayFromYummly': error});
    })
  });
}



var saveRecipe = function(recipe, course){
  return new Promise(function(resolve, reject){
    new Recipe({'id': recipe.id}).fetch().then(function(found){
      if(!found){
        var newRecipe = new Recipe({
          'id': recipe.id,
          'recipeName': recipe.name,
          'sourceDisplayName': recipe.sourceDisplayName,
          'smallImgUrl': recipe.images && recipe.images[0].hostedSmallUrl,
          'largeImgUrl': recipe.images && recipe.images[0].hostedLargeUrl,
          'cuisine': recipe.attributes.cuisine,
          'course': course,
          'holiday': recipe.attributes.holiday,
          'totalTimeInSeconds': recipe.totalTimeInSeconds,
          'ingredients':  recipe.ingredientLines.join('|'),
          'rating':recipe.rating,
          'salty': recipe.flavors && recipe.flavors.salty,
          'sour': recipe.flavors && recipe.flavors.sour,
          'sweet':recipe.flavors && recipe.flavors.sweet,
          'bitter':recipe.flavors && recipe.flavors.bitter,
          'piquant':recipe.flavors && recipe.flavors.piquant,
          'meaty': recipe.flavors && recipe.flavors.meaty
        }).save({}, {method: 'insert'})
        .then(function(){
          resolve()
        })
        .catch(function(error) {
          reject({'error': error});
        });
      } else {
        resolve()
      }
    });
  });
}
module.exports = {


  createRecipes: function (queryModel) {

    return new Promise(function(resolve, reject){

      //queries takes form of
      //{
      //  breakfastQuery: "...",
      //  lunchQuery: "...",
      //  dinnerQuery: "..."
      //}
      //if course has 0 meals, that query will result in empty string
      var queries = writeQueries(queryModel);

      Promise.all([
        queryYummly(queries.breakfastQuery),
        queryYummly(queries.lunchQuery),
        queryYummly(queries.dinnerQuery)
      ])
      .then(function(results){
        //resolved value will be empty array if empty string is passed in
        var breakfasts = results[0] || results[0].matches;
        var lunches = results[1] || results[1].matches;
        var dinners = results[2] || results[2].matches;
        console.log(dinners);
        resolve({
          'breakfastRecipes': breakfasts,
          'lunchRecipes': lunches,
          'dinnerRecipes': dinners
        });

      })
      .catch(function(error){
        console.log('error in create recipes:', error);
        reject({'error': error});
      });
    });
  },

  //optimization note: lookup in database for preexisting recipes
  //potentially save two separate ids for recipes
  //matchId -> id from yummly match
  //getId -> id from individual get request
  getMealPlanRecipes: function(body){

    var recipeObject = {
      "breakfast": utils.parseRecipeIds(body.breakfastRecipes),
      "lunch": utils.parseRecipeIds(body.lunchRecipes),
      "dinner": utils.parseRecipeIds(body.dinnerRecipes)
    };

    return new Promise(function(resolve, reject){

      Promise.props({
        'breakfast': getArrayFromYummly(recipeObject.breakfast),
        'lunch': getArrayFromYummly(recipeObject.lunch),
        'dinner': getArrayFromYummly(recipeObject.dinner)
      })
      .then(function(mealPlanRecipes){
        resolve(mealPlanRecipes);
      })
      .catch(function(error){
        reject({'error in getMealPlanRecipes': error});
      })
    })
  },
  saveRecipeArray: function(recipeArray, course){
    return new Promise(function(resolve, reject){
      var promises = [];
      for(var i = 0; i < recipeArray.length; i++){
        promises.push(saveRecipe(recipeArray[i], course))
      }

      Promise.all(promises)
      .then(function(){
        resolve();
      })
      .catch(function(error){
        reject({'error saving recipe array': error});
      })
    });
  },
  createIngredientsList: function (request, response) {
    if (!request.body.mealPlanId) {
      response.status(404).send({error: "Meal plan not found!"});
    }
    var mealPlanId = request.body.mealPlanId;

    new MealPlan({id: mealPlanId}).fetch({withRelated: 'recipes'}).then(function(model){
      var ingredients = [];
      model.related('recipes').forEach(function(item){
        var recipeIngredients = item.get('ingredients');
        recipeIngredients = recipeIngredients.split('|');
        console.log('recipe ingredients after split', recipeIngredients);
        ingredients = ingredients.concat(recipeIngredients);
      });
      response.status(200).send(ingredients);
    })
    .catch(function(error) {
      response.status(404).send({error: "Meal plan not found!"});
    });
  }
};

