const dayjs = require("dayjs");
const db = require("./db");

exports.createAccess = async (req, res) => {
    const { accessID, createdBy, date, entryTime, status, authBy } = req.body;
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
        res.status(201).json({ id: rows.insertId, message: "Access control record created successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};