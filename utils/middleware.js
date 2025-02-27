const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = async (req, h) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return h.response({ error: "Token is required" }).code(401);
  }

  const token = authHeader.split(" ")[1]; // Ambil token dari header

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Simpan data user di request
    return h.continue;
  } catch (error) {
    return h.response({ error: "Invalid or expired token" }).code(403);
  }
};

module.exports = { verifyToken };
