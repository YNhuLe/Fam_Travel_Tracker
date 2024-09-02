import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { render } from "ejs";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Lenhuy@1996",
  port: 5432,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "July", color: "teal" },
  { id: 2, name: "Jane", color: "powderblue" },
];

async function checkVisited() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  res.render("landing_page.ejs");
});

//render the index page with the list of visited countries
app.get("/views/index", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});
//render the login page for the landing page
app.get("/", async (req, res) => {
  res.render("login_page.ejs");
});

//render the login page
app.get("/views/login_page", async (req, res) => {
  res.render("login_page.ejs");
});

//add country to the list of visited_countries from user's input
app.post("/views/index", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;

    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (error) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

//add new user into the list of family member
app.post("/user", async (req, res) => {
  const newUser = req.body["name"]; //get user's name from user's input field
  try {
    await db.query("INSERT INTO users (name) VALUES ($1)", [newUser]);
  } catch (err) {
    console.log(err);
  }

  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name; // get name of new user fro the input field in the form
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *;", // insert new user with their color into the users table and  return the newest insert
    [name, color]
  );

  const id = result.rows[0].id; // get id of new user from the result
  currentUserId = id;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Log is listening to http://localhost:${port}`);
});
