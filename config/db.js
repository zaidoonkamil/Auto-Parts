const { Sequelize } = require("sequelize");
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(
  "autopartsdatabase",
  "autoparts",
  "StrongPass123!",
  {
    host: "127.0.0.1",
    port: 3306,
    dialect: "mysql",
    logging: false,
  }
);

sequelize.authenticate()
    .then(() => console.log("✅ Connected to MySQL successfully!"))
    .catch(err => console.error("❌ Unable to connect to MySQL:", err));
    

module.exports = sequelize;
