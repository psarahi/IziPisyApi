const dayjs = require("dayjs");
const db = require("./db");

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