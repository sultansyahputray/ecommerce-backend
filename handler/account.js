const db = require('../db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADMIN,
    pass: process.env.PASS_ADMIN,
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_ADMIN,
    to: email,
    subject: "Your OTP Registration",
    text: `Your OTP code is: ${otp}`,
  };

  await transporter.sendMail(mailOptions);
};

const registerAccount = async (req, h) => {
  const {email, password, name} = req.payload;
  
  if (!email || !password || !name) {
    return h.response({ error: "Email, password, and name are required" }).code(400);
  }

  try {
    const [existingUser] = await db.query('SELECT email FROM users WHERE email = ?', [email]);

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser.length > 0) {
      return h.response({error: "email already registered"}).code(400);
    } 

    else if (existingUser.length === 0) {
      await db.query(`INSERT INTO users (name, email, password) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password)`, 
        [name, email, hashedPassword]);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    await sendOTPEmail(email, otp);

    await db.query(`INSERT INTO otp_verification (email, otp) 
      VALUES (?, ?) ON DUPLICATE KEY UPDATE otp = VALUES(otp)`, [email, otp]);

    return h.response({message: "OTP send to email"}).code(200);
  } 
  
  catch (error) {
    console.error("error during registration:", error);
    return h.response({error: 'failed register user'}).code(500);
  }
};

const verifyOTP = async (req, h) => {
  const {email, otp} = req.payload;

  if (!email || !otp) {
    return h.response({error: "email and otp are required"}).code(400);
  }

  try {
    const [otpData] = await db.query('SELECT * FROM otp_verification WHERE email = ? AND otp = ?', [email, otp]);

    if (otpData.length === 0) {
      return h.response({error: "invalid OTP or email"}).code(400);
    }

    await db.query('UPDATE users SET is_verified = TRUE WHERE email = ?', [email]);

    await db.query('DELETE FROM otp_verification WHERE email = ?', [email]);

    return h.response({message: "registration successfully"}).code(200);
  } 
  
  catch (error) {
    console.error("error verifying otp:", error);
    return h.response({error: "faile verify otp"}).code(500);
  }
};

const loginUser = async (req, h) => {
  const {email, password} = req.payload;

  if (!email || !password) {
    return h.response({error: "email and password are required"}).code(400);
  }

  try {
    const [user] = await db.query('SELECT * FROM users WHERE email = ? AND is_verified = TRUE', [email]);

    if (user.length === 0) {
      return h.response({error: "user not found or verified"}).code(400);
    }

    const isPasswordValid = await bcrypt.compare(password, user[0].password);

    if (!isPasswordValid) {
      return h.response({error: "password or email invalid"}).code(400);
    }

    return h.response({message: "login successfully"}).code(200);
  } 
  
  catch (error) {
    console.error("error while loging in:", error);
    return h.response({error: "failed to login"}).code(500);
  }
};

module.exports = {
  registerAccount,
  verifyOTP,
  loginUser,
}