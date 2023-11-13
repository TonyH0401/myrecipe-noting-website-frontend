require("dotenv").config();
const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 100, // Limit each IP to 21 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
});
const fetch = require("node-fetch");

//
const API = process.env.API;

//
router.get("/register", limiter, (req, res) => {
  return res.status(200).render("accounts/register", {
    document: "Account Register",
  });
});

router.post("/register", (req, res) => {
  return res.status(200).json({
    code: 1,
  });
});
// login
router.get("/login", limiter, async (req, res) => {
  // const currentUser = req.session.user;
  // if (!currentUser) {
  //   return res.status(200).render("accounts/login", {
  //     document: "Login Page",
  //     style: "login",
  //   });
  // }
  return res.status(200).render("accounts/login", {
    document: "Login Page",
    style: "login",
    error: req.flash("error") || "",
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
      return res.status(500).render("error/500", {
        document: "Error",
        message: error.message,
      });
    });
  if (!data) {
    return res.status(500).render("error/500", {
      document: "Error",
      message: "No Data",
    });
  }
  if (data.code == 0) {
    return res.status(500).render("error/500", {
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
// otp
router.get("/otp", (req, res) => {
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
  // console.log(censor);
  return res.status(200).render("accounts/otp", {
    document: "OTP Verification",
    style: "otp",
    censorEmail: censorEmail,
  });
});
router.post("/otp", (req, res) => {
  const { otp } = req.body;
});

module.exports = router;
