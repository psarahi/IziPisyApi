const dayjs = require("dayjs");
const db = require("./db");
const userController = require("./UserController");

exports.createAccess = async (req, res) => {
    const { accessID, createdBy, date, entryTime, status, authBy, personName } = req.body;
    try {
        const [rows] = await db.query(`
            INSERT INTO iziPizy.access_control
            (accessID, createdBy, date, entryTime,
            status, authBy)
            VALUES
            (?, ?, ?, ?, ?, ?)
            `,
            [
                accessID,
                createdBy,
                date,
                entryTime,
                status,
                authBy
            ]
        );

        const notificationResult = await userController.notifyAccessCreated(createdBy, {
            accessID,
            createdBy,
            personName,
            date,
            entryTime,
            status,
            authBy
        });

        return res.status(201).json({
            id: rows.insertId,
            message: "Access control record created successfully",
            notification: notificationResult
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.accessUsed = async (userId, payload = {}) => {
    try {
        const notificationResult = await userController.sendNotificationToUser(userId, {
            title: payload.title || "IziPisy",
            body: payload.body || "Se ha utilizado tu acceso",
            icon: payload.icon || "/icon.png",
            data: payload.data || {},
            tag: payload.tag || "izipisy-access"
        });

        return {
            success: true,
            notification: notificationResult
        };
    } catch (error) {
        console.error("Error al enviar notificación de acceso usado:", error);
        return {
            success: false,
            reason: error.message
        };
    }
};