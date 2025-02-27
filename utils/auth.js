const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user.id }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' } // Token berlaku selama 1 jam
  );
};

module.exports = { generateToken };
