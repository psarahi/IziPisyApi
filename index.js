const http = require("http");
const cors = require("cors");
const express = require("express");
const app = express();
const path = require("path");

const PORT = process.env.PORT || 3010;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userRoutes = require("./Routers/UserRoutes");
const accessControlRoutes = require("./Routers/AccessControlRoutes");

app.use("/api/users", userRoutes);
app.use("/api/access-control", accessControlRoutes);

app.get("/", (req, res) => {
	res.json({
		ok: true,
		message: "API activa - build",
	});
});

app.get("/health", (req, res) => {
	res.status(200).json({
		status: "up",
		port: PORT,
	});
});

app.listen(PORT, () => {
	console.log(`Servidor API ejecutandose en http://localhost:${PORT}`);
});
