require("dotenv").config();
const express = require("express");
const createError = require("http-errors");
const path = require("path");
const cors = require("cors");
const exphbs = require("express-handlebars");
const session = require("express-session");
const bodyParser = require("body-parser");
const flash = require("connect-flash");
const morgan = require("morgan");
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

// .env
const port = process.env.PORT || "2020";
const secret = process.env.SECRET || "numa";

// init app
const app = express();

// view engine
app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
  })
);
app.set("view engine", ".hbs");
app.set("views", "./views");

// app use
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(flash());
app.use(morgan("dev"));
app.use(
  session({
    secret: secret,
    saveUninitialized: true,
    cookie: { maxAge: 15 * 60 * 1000 },
  })
);

// default route
app.get("/", limiter, (req, res) => {
  const currentUser = req.session.user;
  if (currentUser) {
    return res.status(201).redirect("/accounts/home");
  }
  return res.status(202).render("home", {
    document: "Welcome Page",
    style: "style",
  });
});

// New Routers
const AccountRouter = require("./routers/AccountRouter");
app.use("/accounts", AccountRouter);
const RecipeRouter = require("./routers/RecipeRouter");
app.use("/recipes", RecipeRouter);

// error handling
app.use((req, res, next) => {
  next(createError(404, "This directory does not exist!"));
});
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  return res.status(500).render("errors/500", {
    document: "Not found",
    message: err.message,
  });
});

app.listen(port, () => {
  console.log(`> Website running at: http://localhost:${port}`);
});
