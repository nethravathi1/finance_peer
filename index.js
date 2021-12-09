const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

var db = new sqlite3.Database(path.resolve(__dirname, "./financepeer.db"));

db.run(
  "CREATE TABLE customers(username text,name text,password text,gender text,location text)"
);

db.close();

const dbPath = path.join(__dirname, "./financepeer.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/customer/", async (request, response) => {
  const getBooksQuery = `
  SELECT
    *
  FROM
    customers
  ORDER BY
    id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

// User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
     customers
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      customers (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM customers WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.post("/customers/", async (request, response) => {
  const customerDetails = request.body;

  const values = customerDetails.map(
    (eachUser) =>
      `('${eachUser.user_id}', ${eachUser.id},${eachUser.title},${eachUser.body})`
  );

  let db = new sqlite3.Database("./financePeer.db");

  db.run("CREATE TABLE langs(user_id integer,id integer,title text,body text)");

  db.close();

  const valuesString = values.join(",");

  const customerQuery = `
    INSERT INTO
      customer (user_id,id,title,body)
    VALUES
       ${valuesString};`;

  const dbResponse = await db.run(customerQuery);
  const customerId = dbResponse.lastID;
  response.send({ customerId: customerId });
});
