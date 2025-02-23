const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost', // Sesuaikan dengan XAMPP
  user: 'root', // Default user XAMPP
  password: '', // Kosongkan jika tidak ada password
  database: 'ecommerce_db', // Ganti dengan nama database-mu
});

module.exports = pool.promise();
