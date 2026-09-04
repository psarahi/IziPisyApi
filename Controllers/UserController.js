const dayjs = require("dayjs");
const db = require("./db");
const webPush = require("web-push");
// npx web-push generate-vapid-keys
const subscriptionsByUser = new Map();

const getVapidConfig = () => ({
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || "mailto:admin@izipisy.com"
});

if (getVapidConfig().publicKey && getVapidConfig().privateKey) {
    webPush.setVapidDetails(
        getVapidConfig().subject,
        getVapidConfig().publicKey,
        getVapidConfig().privateKey
    );
}

const isValidSubscription = (subscription) => {
    return subscription &&
        typeof subscription === "object" &&
        typeof subscription.endpoint === "string" &&
        subscription.endpoint &&
        subscription.keys &&
        typeof subscription.keys.p256dh === "string" &&
        typeof subscription.keys.auth === "string";
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(`
            SELECT 
                *
            FROM users a
            where a.username = ? and a.password = ?`,
            [
                username,
                password
            ]
        );
        if (rows.length > 0) {
            res.json({ data: rows[0], message: "Login successful" });
        } else {
            res.status(401).json({ message: "Invalid username or password" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.saveSubscription = async (req, res) => {
    const { userId, subscription } = req.body;

    if (!userId || !isValidSubscription(subscription)) {
        return res.status(400).json({
            message: "Se requiere userId y una subscription válida para push notifications"
        });
    }

    const normalizedUserId = Number(userId);
    subscriptionsByUser.set(normalizedUserId, subscription);

    return res.status(201).json({
        message: "Suscripción guardada correctamente",
        userId: normalizedUserId
    });
};

exports.sendNotificationToUser = async (userId, payload = {}) => {
    const normalizedUserId = Number(userId);
    const subscription = subscriptionsByUser.get(normalizedUserId);

    if (!subscription) {
        return {
            sent: false,
            reason: "No hay una suscripción activa para este usuario"
        };
    }

    const { publicKey, privateKey } = getVapidConfig();
    if (!publicKey || !privateKey) {
        return {
            sent: false,
            reason: "Faltan las claves VAPID para enviar notificaciones push"
        };
    }

    const message = JSON.stringify({
        title: payload.title || "IziPisy",
        body: payload.body || "Tienes una nueva notificación",
        icon: payload.icon || "/icon.png",
        data: payload.data || {},
        tag: payload.tag || "izipisy-access"
    });

    try {
        await webPush.sendNotification(subscription, message);
        return {
            sent: true,
            userId: normalizedUserId
        };
    } catch (error) {
        console.error("Error al enviar notificación push:", error);

        if (error.statusCode === 404 || error.statusCode === 410) {
            subscriptionsByUser.delete(normalizedUserId);
        }

        return {
            sent: false,
            userId: normalizedUserId,
            reason: error.message
        };
    }
};

exports.notifyAccessCreated = async (createdByUserId, accessData = {}) => {
    const accessId = accessData.accessID || accessData.id || "N/A";
    const personName = accessData.personName || "persona";

    return exports.sendNotificationToUser(createdByUserId, {
        title: "Acceso registrado",
        body: `Se registró el acceso para ${personName} con folio ${accessId}.`,
        tag: "izipisy-access-created",
        data: {
            type: "access_created",
            accessId,
            createdByUserId,
            ...accessData
        }
    });
};

exports.sendTestNotification = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "Se requiere el userId" });
    }

    const result = await exports.sendNotificationToUser(userId, {
        title: "Prueba de notificación",
        body: "Esta es una prueba de envío de notificación push",
        tag: "izipisy-test",
        data: { type: "test" }
    });

    if (!result.sent) {
        return res.status(404).json({
            message: "No se pudo enviar la notificación",
            ...result
        });
    }

    return res.status(200).json({
        message: "Notificación enviada correctamente",
        ...result
    });
};