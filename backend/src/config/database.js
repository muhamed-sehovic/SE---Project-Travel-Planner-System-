
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "hasomujo123",
  database: "TravelPlanner",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = {
  /**
   * Find all records in a table, optionally filtered.
   * @param {string} table
   * @param {object} [where]  key/value pairs that must all match (AND)
   */
  async findAll(table, where = {}) {
    const keys = Object.keys(where);
    if (keys.length === 0) {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      return rows;
    }
    const conditions = keys.map((k) => `\`${k}\` = ?`).join(" AND ");
    const values = keys.map((k) => where[k]);
    const [rows] = await pool.query(
      `SELECT * FROM \`${table}\` WHERE ${conditions}`,
      values
    );
    return rows;
  },

  async findOne(table, where = {}) {
    const rows = await this.findAll(table, where);
    return rows[0] || null;
  },

  async findById(table, id) {
    return this.findOne(table, { id });
  },


  async insert(table, record) {
    const clean = Object.fromEntries(
      Object.entries(record).filter(([, v]) => v !== undefined)
    );
    const keys = Object.keys(clean);
    const values = keys.map((k) => clean[k]);
    const cols = keys.map((k) => `\`${k}\``).join(", ");
    const placeholders = keys.map(() => "?").join(", ");

    const [result] = await pool.query(
      `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`,
      values
    );
    const [rows] = await pool.query(
      `SELECT * FROM \`${table}\` WHERE id = ?`,
      [result.insertId]
    );
    return rows[0];
  },

  async update(table, id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(table, id);
    const setClause = keys.map((k) => `\`${k}\` = ?`).join(", ");
    const values = [...keys.map((k) => fields[k]), id];
    await pool.query(
      `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`,
      values
    );
    return this.findById(table, id);
  },


  async delete(table, id) {
    const [result] = await pool.query(
      `DELETE FROM \`${table}\` WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  },

 
  async deleteWhere(table, where = {}) {
    const keys = Object.keys(where);
    if (keys.length === 0) return; 
    const conditions = keys.map((k) => `\`${k}\` = ?`).join(" AND ");
    const values = keys.map((k) => where[k]);
    await pool.query(
      `DELETE FROM \`${table}\` WHERE ${conditions}`,
      values
    );
  },

  pool,
};

module.exports = db;