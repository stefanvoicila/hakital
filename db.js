var mysql = require('mysql')

var connection = mysql.createConnection({
  // host: process.env.DB_HOST,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,
  // port: process.env.DB_PORT,
  //socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'

  host: "127.0.0.1",
  user: "root",
  password: "root",
  socketPath: "/Applications/MAMP/tmp/mysql/mysql.sock",
  port: 8889,
  database : "ProiectBD"
})

connection.connect()

module.exports = connection;