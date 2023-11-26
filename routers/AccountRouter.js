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
} = require("../middlewares/utils");

// /accounts/register
router.get("/register", limiter, (req, res) => {
  const currentUser = req.session.user;
  if (currentUser) {
    return res.status(200).redirect("/accounts/home");
  }
  return res.status(200).render("accounts/register", {
    document: "Register Page",
    style: "register",
    error: req.flash("error") || "",
  });
});
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, phone, password1, password2, terms } =
    req.body;
  if (!terms) {
    req.flash("error", "You have not accepted the terms of condition!");
    return res.status(300).redirect("/accounts/register");
  }
  if (password1 != password2) {
    req.flash("error", "Password Confirmation Incorrect!");
    return res.status(300).redirect("/accounts/register");
  }
  // fetch /login
  let body = JSON.stringify({
    firstName: firstName,
    lastName: lastName,
    emailAddress: email,
    phoneNumber: phone.toString().replaceAll("-", ""),
    password1: password1,
    password2: password2,
  });
  let data;
  await fetch(API + "/accounts/register", {
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
  if (!data) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: "No Register Data",
    });
  }
  if (data.code == 0) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  if (!data.success) {
    req.flash("error", data.message);
    return res.status(300).redirect("/accounts/register");
  }
  // render to JWT validation waiting if success
  return res.render("accounts/account-verify", {
    document: "Waiting Verify",
    style: "account-verify",
    message: `Please check your ${email} email account!`,
  });
});
// /accounts/verify
// verify JWT for register
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  let data;
  await fetch(API + `/accounts/verify?token=${token}`, {
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
  if (!data) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: "No Verify Data",
    });
  }
  // console.log(data)
  if (data.code == 0) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  if (!data.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message.message,
    });
  }
  req.flash("success", data.message);
  return res.status(200).redirect("/accounts/login");
});
// /accounts/login
router.get("/login", limiter, async (req, res) => {
  const currentUser = req.session.user;
  if (currentUser) {
    return res.status(200).redirect("/accounts/home");
  }
  return res.status(200).render("accounts/login", {
    document: "Login Page",
    style: "login",
    error: req.flash("error") || "",
    success: req.flash("success") || "",
  });
});
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let body = JSON.stringify({
    emailAddress: email,
    accountPassword: password,
  });
  let data;
  await fetch(API + "/accounts/login", {
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
  if (!data) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: "No Data",
    });
  }
  if (data.code == 0) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  if (!data.success) {
    req.flash("error", data.message);
    return res.status(404).redirect("/accounts/login");
  }
  req.flash("email", email);
  return res.status(200).redirect("/accounts/otp");
});
// /accounts/otp
router.get("/otp", limiter, (req, res) => {
  const currentUser = req.session.user;
  if (currentUser) {
    return res.status(200).redirect("/accounts/home");
  }
  const email = req.flash("email") || "";
  if (email.length == 0) {
    req.flash("error", "Account OTP Error! Please Re-Login!");
    return res.status(404).redirect("/accounts/login");
  }
  if (!email) {
    req.flash("error", "Account OTP Error! Please Re-Login!");
    return res.status(404).redirect("/accounts/login");
  }
  let fields = email.toString().split("@");
  let censorEmail = fields[0][0] + "****" + "@" + fields[1];
  return res.status(200).render("accounts/otp", {
    document: "OTP Verification",
    style: "otp",
    censorEmail: censorEmail,
    email: email,
    error: req.flash("error") || "",
  });
});
router.post("/otp", async (req, res) => {
  const { otp, email } = req.body;
  let body = JSON.stringify({
    accountEmail: email,
    otpCode: otp,
  });
  let data;
  await fetch(API + "/accounts/otp", {
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
  if (data.code == 0) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: data.message,
    });
  }
  if (!data.success) {
    req.flash("email", email);
    req.flash("error", data.message);
    return res.status(404).redirect("/accounts/otp");
  }
  // assign user session
  req.session.user = email;
  return res.status(200).redirect("/accounts/home");
});
// /accounts/home
router.get("/home", limiter, async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) {
    return res.status(300).redirect("/");
  }
  let accountInfo = await accountInfoByEmail(currentUser);
  if (!accountInfo.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: accountInfo.message,
    });
  }
  let recipeListFound = await getRecipebyAccId(accountInfo.info._id);
  if (!recipeListFound.success) {
    return res.status(500).render("errors/500", {
      document: "Error",
      message: recipeListFound.message,
    });
  }
  // if the list is not empty, use the code below to map it
  let data = [];
  if (recipeListFound.count != 0) {
    let rawRecipeList = recipeListFound.data;
    data = rawRecipeList.map((e) => {
      return {
        _id: e._id,
        recipeName: e.recipeName,
        createdAt: moment(e.createdAt).format("LLLL"),
        ingredientsList: e.ingredientsList,
        recipeNote: e.recipeNote,
      };
    });
  }
  // if the list is empty, return empty value with recipe count = 0
  return res.status(200).render("accounts/home", {
    document: "Home Page",
    style: "style",
    firstNameDisplay:
      accountInfo.info.firstName + "'s Recipes" || "Your Recipe Page",
    recipeCounter: recipeListFound.count,
    recipeList: data,
    error: req.flash("error") || "",
    success: req.flash("success") || "",
  });
});
// /accounts/logout
router.get("/logout", (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) {
    return res.redirect("/");
  }
  req.session.destroy();
  return res.redirect("/");
});

module.exports = router;
