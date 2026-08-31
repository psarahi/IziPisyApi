const express = require("express");
const router = express.Router();
const {
    getAsistencias,
    registrarAsistencia,
    sendAsistencias,
    downloadAsistencias
} = require("./controller");

// Rutas de email
router.get("/asistencias/:fechaInicio/:fechaFin", getAsistencias);
router.get("/sendAsistencias/:fechaInicio/:fechaFin", sendAsistencias);
router.get("/downloadAsistencias/:fechaInicio/:fechaFin", downloadAsistencias);
router.post("/registrarAsistencia", registrarAsistencia);

module.exports = router;