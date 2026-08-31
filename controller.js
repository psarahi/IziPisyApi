const dayjs = require("dayjs");
const db = require("./db");
const nodemailer = require("nodemailer");
const ExcelJS = require("exceljs");

// Configuración del transportador
const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
        user: "pms@powersathletic.com",
        pass: "Sys@Pm5#2025",
    },
});

// Función para enviar correo
async function enviarCorreo(destinatario, asunto, mensajeHTML, attachments = []) {
    try {
        await transporter.sendMail({
            from: "pms@powersathletic.com", // Remitente
            to: destinatario,
            subject: asunto,
            html: mensajeHTML,
            attachments
        });

        return true;
    } catch (error) {
        console.error("Error enviando correo:", error);
        return false;
    }
}

exports.getAsistencias = async (req, res) => {
    const { fechaInicio, fechaFin } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                *
            FROM asistencia a
            where a.fecha between ? and ?;`,
            [
                dayjs(fechaInicio).format("YYYY-MM-DD") || dayjs().format("YYYY-MM-DD"),
                dayjs(fechaFin).format("YYYY-MM-DD") || dayjs().format("YYYY-MM-DD")
            ]
        );
        res.status(200).json({
            ok: true,
            message: "Lista de asistencias",
            data: rows
        });
    } catch (error) {
        console.error("Error obteniendo la lista de asistencias:", error);
        res.status(500).json({
            ok: false,
            message: "Error al obtener la lista de asistencias"
        });
    }
};

exports.sendAsistencias = async (req, res) => {
    const { fechaInicio, fechaFin } = req.params;
    try {
        const [emails] = await db.query(`
            select email from email;`
        );
        const destinatarios = emails.map((item) => item.email).filter(Boolean);
        if (destinatarios.length === 0) {
            return res.status(400).json({
                ok: false,
                message: "No hay correos configurados para envio"
            });
        }

        const inicio = dayjs(fechaInicio, "YYYY-MM-DD", true).isValid()
            ? dayjs(fechaInicio).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD");
        const fin = dayjs(fechaFin, "YYYY-MM-DD", true).isValid()
            ? dayjs(fechaFin).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD");

        const [rows] = await db.query(`
            SELECT * FROM asistencia a
            where a.fecha between ? and ?
            order by a.fecha ASC;`,
            [
                inicio,
                fin
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No hay asistencias para el rango solicitado"
            });
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Asistencias");

        sheet.mergeCells("A1:D1");
        sheet.getCell("A1").value = `Reporte de asistencias ${inicio} a ${fin}`;
        sheet.getCell("A1").font = { bold: true, size: 14 };

        sheet.getCell("A2").value = rows[0].nombre || "Empleado";
        sheet.getCell("A2").font = { bold: true, size: 12 };

        sheet.getCell("A3").value = "# Fecha";
        sheet.getCell("B3").value = "Entrada";
        sheet.getCell("C3").value = "Salida";

        ["A3", "B3", "C3"].forEach((cellAddress) => {
            const cell = sheet.getCell(cellAddress);
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF000000" }
            };
        });

        rows.forEach((item, index) => {
            const rowIndex = index + 4;
            sheet.getCell(`A${rowIndex}`).value = dayjs(item.fecha).format("YYYY-MM-DD");
            sheet.getCell(`B${rowIndex}`).value = item.entrada || "";
            sheet.getCell(`C${rowIndex}`).value = item.salida || "";
        });

        sheet.columns = [
            { key: "Fecha", width: 18 },
            { key: "Entrada", width: 15 },
            { key: "Salida", width: 15 },
        ];

        const excelBuffer = await workbook.xlsx.writeBuffer();
        const nombreArchivo = `reporte-asistencias-aduanas-${inicio}-a-${fin}.xlsx`;

        const asunto = `Reporte de asistencias de aduanas${inicio} a ${fin}`;
        const mensajeHTML = `
            <p>Hola,</p>
            <p>Adjunto se envia el reporte de asistencias de aduanas del periodo <b>${inicio}</b> al <b>${fin}</b>.</p>
            <p>Saludos.</p>
            <p>Favor no responder a este correo.</p>
        `;

        const enviado = await enviarCorreo(
            destinatarios.join(","),
            asunto,
            mensajeHTML,
            [
                {
                    filename: nombreArchivo,
                    content: Buffer.from(excelBuffer),
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
            ]
        );

        if (!enviado) {
            return res.status(500).json({
                ok: false,
                message: "No se pudo enviar el correo con el reporte"
            });
        }


        res.status(200).json({
            ok: true,
            message: "Reporte enviado por correo correctamente",
            data: {
                destinatarios,
                totalRegistros: rows.length,
                archivo: nombreArchivo
            }
        });
    } catch (error) {
        console.error("Error enviando reporte de asistencias:", error);
        res.status(500).json({
            ok: false,
            message: "Error al enviar el reporte de asistencias"
        });
    }
};

exports.downloadAsistencias = async (req, res) => {
    const { fechaInicio, fechaFin } = req.params;
    try {
        const inicio = dayjs(fechaInicio, "YYYY-MM-DD", true).isValid()
            ? dayjs(fechaInicio).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD");
        const fin = dayjs(fechaFin, "YYYY-MM-DD", true).isValid()
            ? dayjs(fechaFin).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD");

        const [rows] = await db.query(`
            SELECT 
                *
            FROM asistencia a
            where a.fecha between ? and ?
            order by a.codigo, a.fecha ASC;`,
            [
                inicio,
                fin
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                message: "No hay asistencias para el rango solicitado"
            });
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Asistencias");

        sheet.columns = [
            { header: "Codigo", key: "codigo", width: 8 },
            { header: "Entrada", key: "entrada", width: 14 },
            { header: "Salida", key: "salida", width: 14 },
            { header: "Fecha", key: "fecha", width: 16 },
        ];

        rows.forEach((item) => {
            sheet.addRow({
                codigo: item.codigo,
                entrada: item.entrada || "",
                salida: item.salida || "",
                fecha: dayjs(item.fecha).format("YYYY-MM-DD")
            });
        });

        sheet.getRow(1).font = { bold: true };

        const nombreArchivo = `asistencias-${inicio}-a-${fin}.xlsx`;
        const excelBuffer = await workbook.xlsx.writeBuffer();

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);

        return res.status(200).send(Buffer.from(excelBuffer));
    } catch (error) {
        console.error("Error enviando reporte de asistencias:", error);
        res.status(500).json({
            ok: false,
            message: "Error al enviar el reporte de asistencias"
        });
    }
};

exports.registrarAsistencia = async (req, res) => {
    try {
        const codigo = req.body?.codigo ?? req.body?.params?.codigo ?? req.query?.codigo ?? req.params?.codigo;
        if (!codigo) {
            return res.status(400).json({
                ok: false,
                message: "Debe enviar el codigo de asistencia"
            });
        }

        // Revisar si ya existe un registro de asistencia para el día actual
        const [rows] = await db.query(`SELECT * FROM asistencia
            where fecha = ? and codigo = ?;`, [dayjs().format("YYYY-MM-DD"), codigo]);

        // Si existe registros para el dia actual sin salida, al menos deben haber pasado
        // al menos 1 hora desde la entrada para registrar la salida
        if (rows.length > 0 && rows[0].salida === null) {
            const entrada = dayjs(rows[0].entrada, "HH:mm:ss");
            const ahora = dayjs();
            if (ahora.diff(entrada, "hour") < 1) {
                return res.status(400).json({
                    ok: false,
                    message: "Debe esperar al menos 1 hora desde la entrada para registrar la salida"
                });
            }
        }
        let type = rows.length === 0 ? "entrada" : "salida";

        if (rows.length > 0 && rows[0].salida !== null && rows[0].entrada !== null) {
            return res.status(400).json({
                ok: false,
                message: "Ya se registró la entrada y salida para hoy"
            });
        }
        if (type === "entrada") {
            await db.query(`
            INSERT INTO asistencia
                (codigo, entrada, salida, fecha)
            VALUES
            (?,?,?,?);
            `,
                [
                    codigo,
                    dayjs().format("HH:mm:ss"),
                    null,
                    dayjs().format("YYYY-MM-DD HH:mm:ss")
                ]);
        } else {
            await db.query(`
            UPDATE asistencia
            SET salida = ?  
            WHERE id = ?;
            `,
                [
                    dayjs().format("HH:mm:ss"),
                    rows[0].id
                ]);
        }

        res.status(200).json({
            ok: true,
            message: "Asistencia registrada correctamente",
            data: rows
        });
    } catch (error) {
        console.error("Error registrando la asistencia:", error);
        res.status(500).json({
            ok: false,
            message: "Error al registrar la asistencia"
        });
    }
};