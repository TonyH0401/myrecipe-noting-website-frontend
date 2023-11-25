require("dotenv").config();
const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 100, // Limit each IP to 21 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: `<div style="width:100vh; padding: 1rem; background-color: red; font-size: 32px; font-weight: 700; 
  text-align: center; margin: 0 auto"> 
    <h3 style="color: white">You are suspended for sending too many requests!</h3>
  </div> `,
});
const fetch = require("node-fetch");
const moment = require("moment");

// .env
const API = process.env.API;

//custom functions
const {
  accountInfoByEmail,
  getRecipebyAccId,
  returnObjIngredientsRawInput,
} = require("../middlewares/utils");

// /recipes/create
router.get("/create", limiter, async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) {
    return res.status(201).redirect("/");
  }
  let accountInfo = await accountInfoByEmail(currentUser);
  if (!accountInfo.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: accountInfo.message,
    });
  }
  return res.status(200).render("recipes/create", {
    document: "Create Recipe",
    style: "style",
    error: req.flash("error") || "",
    success: req.flash("success") || "",
    firstNameDisplay:
      accountInfo.info.firstName + "'s Recipes" || "Your Recipe Page",
  });
});
router.post("/create", async (req, res) => {
  // get raw data from req.body
  const { recipeTitle, ingredientName, ingredientQuantity, recipeNote } =
    req.body;
  // get session user
  const currentUser = req.session.user;
  // create an array of object with ingredientName array and ingredientQuantity array
  let recipeListObj = returnObjIngredientsRawInput(
    ingredientName,
    ingredientQuantity
  );
  // find the account
  let accountFound = await accountInfoByEmail(currentUser);
  // if account is not found render error page
  if (!accountFound.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: accountFound.message,
    });
  }
  // get the userID only from the account
  const currentUserID = accountFound.info._id;
  // assemble the data and JSON.stringify it
  let body = JSON.stringify({
    recipeName: recipeTitle,
    ingredientsList: recipeListObj,
    recipeNote: recipeNote,
    recipeAuthor: currentUserID,
  });
  // calling the fetch API to back-end
  let data;
  await fetch(API + "/recipes/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body,
  })
    .then(async (result) => {
      data = await result.json();
    })
    .catch((error) => {
      return res.status(500).render("errors/500", {
        document: "Error",
        message: error.message,
      });
    });
  if (!data.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  // all failed messages got catch and render as error page
  // only success message is returned
  req.flash("success", data.message);
  return res.status(200).redirect("/accounts/home");
});

// /recipes/delete/:recipeid
router.get("/delete/:recipeid", async (req, res) => {
  const { recipeid } = req.params;
  let data;
  await fetch(API + `/recipes/delete/${recipeid}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  })
    .then(async (result) => {
      data = await result.json();
    })
    .catch((error) => {
      return res.status(500).render("errors/500", {
        document: "Error",
        message: error.message,
      });
    });
  if (!data.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  // I guess I cant return a redirect from a DELETE, because it will find the endpoint of the redirect but with the DELETE method
  // so if I res.redirect in DELETE to "/", it will try and find the "/" but with the DELETE method
  req.flash("success", data.message);
  return res.status(200).redirect("/accounts/home");
});

// /recipes/edit/:recipeid
router.get("/edit/:recipeid", async (req, res) => {
  const currentUser = req.session.user;
  const { recipeid } = req.params;
  if (!currentUser) {
    return res.status(201).redirect("/");
  }
  let accountInfo = await accountInfoByEmail(currentUser);
  if (!accountInfo.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: accountInfo.message,
    });
  }
  let data;
  await fetch(API + `/recipes/recipe/${recipeid}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then(async (result) => {
      data = await result.json();
    })
    .catch((error) => {
      return res.status(500).render("errors/500", {
        document: "Error",
        message: error.message,
      });
    });
  if (!data.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  return res.status(200).render("recipes/edit", {
    document: "Edit Recipe",
    style: "style",
    firstNameDisplay:
      accountInfo.info.firstName + "'s Recipes" || "Your Recipe Page",
    recipeInfo: data.data,
    error: req.flash("error") || "",
    success: req.flash("success") || "",
  });
});
router.post("/edit/:recipeid", async (req, res) => {
  //get required values
  const currentUser = req.session.user;
  const { recipeid } = req.params;
  const { recipeTitle, recipeNote, ingredientName, ingredientQuantity } =
    req.body;
  //find account based on session user
  let accountInfo = await accountInfoByEmail(currentUser);
  if (!accountInfo.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: accountInfo.message,
    });
  }
  // get session user ID
  const currentUserID = accountInfo.info._id;
  let recipeListObj = returnObjIngredientsRawInput(
    ingredientName,
    ingredientQuantity
  );
  // JSON stringify the data
  let body = JSON.stringify({
    recipeName: recipeTitle,
    ingredientsList: recipeListObj,
    recipeNote: recipeNote,
    recipeAuthor: currentUserID,
  });
  // fetch to BE API
  let data;
  await fetch(API + `/recipes/edit/${recipeid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body,
  })
    .then(async (result) => {
      data = await result.json();
    })
    .catch((error) => {
      return res.status(500).render("errors/500", {
        document: "Error",
        message: error.message,
      });
    });
  if (!data.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  req.flash("success", `Recipe called: ${data.data.recipeName} is Updated!`);
  return res.status(200).redirect("/accounts/home");
});

module.exports = router;
