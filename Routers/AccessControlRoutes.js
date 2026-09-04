const express = require("express");
const router = express.Router();
const accessControlController = require("../Controllers/AccessControlController");

router.post("/create", accessControlController.createAccess);

module.exports = router;
