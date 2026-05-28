const { pool } = require('./config/database');
pool.query('SELECT * FROM users LIMIT 1')
  .then(res => { console.log("Success:", res.rows); process.exit(0); })
  .catch(err => { console.error("DB Error:", err); process.exit(1); });
