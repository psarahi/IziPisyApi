const express = require("express");
const router = express.Router();
const userController = require("../Controllers/UserController");

router.post("/login", userController.login);
router.post("/subscribe", userController.saveSubscription);
router.post("/send-test-notification", userController.sendTestNotification);

module.exports = router;