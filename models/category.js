const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); 

const Category = sequelize.define("Category", {
    id: { 
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true 
    },
    name: { 
        type: DataTypes.STRING,
        allowNull: false 
    },
    name_ar: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    name_ckb: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    images: {
        type: DataTypes.JSON,
        allowNull: false 
    }
}, {
    timestamps: true,
});

module.exports = Category;
