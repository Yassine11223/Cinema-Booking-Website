const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('Admin123!', 10);
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cinema_db',
  user: 'postgres',
  password: 'Hall2580'
});

pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, 'admin@thehallcinemas.com'])
  .then(() => {
    console.log('Password updated successfully');
    pool.end();
  })
  .catch(err => {
    console.error(err);
    pool.end();
  });
