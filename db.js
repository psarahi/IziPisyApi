const mysql = require("mysql2/promise");

const connection = mysql.createPool({
  host: process.env.HOSTDB,
  user: process.env.USERDB,
  password: process.env.PASSWORDDB,
  database: process.env.DBPRODUCTION,
  waitForConnections: true,
  connectionLimit: 10,
});

// Verificar conexión solo si lo necesitas explícitamente
(async () => {
  try {
    const conn = await connection.getConnection();
    console.log(`Conectado a la base de datos MySQL: ${process.env.DBPRODUCTION}`);
    conn.release();
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err);
  }
})();

module.exports = connection;
