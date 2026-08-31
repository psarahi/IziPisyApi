const express = require("express");
const router = express.Router();
const userController = require("../Controllers/UserController");

// Rutas de email
router.post("/login", userController.login);

module.exports = router;