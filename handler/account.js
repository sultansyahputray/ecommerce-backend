const db = require('../utils/db');
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

const {generateToken} = require('../utils/auth');

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

    const token = generateToken(user[0]);

    return h.response({
      message: "login successfully",
      token,
    }).code(200);
  } 
  
  catch (error) {
    console.error("error while loging in:", error);
    return h.response({error: "failed to login"}).code(500);
  }
};

const generateResetToken = (length = 6) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return token;
};

const requestResetPassword = async (req, h) => {
  const {email} = req.payload;

  if (!email) {
    return h.response({error: "email is required"}).code(400);
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return h.response({error: "account not found"}).code(400);
    }

    const resetToken = generateResetToken(6);

    await db.query('UPDATE users SET resetToken = ?, resetTokenExpire = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE email = ?', [resetToken, email]);

    const mailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: email,
      subject: 'Password Reset Token',
      text: `Your reset password token is: ${resetToken}. This token is valid for 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    return h.response({message: "reset token send successfully"}).code(200);
  } 
  
  catch (error) {
    console.error("error sending reset password token", error);
    return h.response({error: "failed to send reset password token"}).code(500);
  }
};

const confirmResetPassword = async (req, h) => {
  const {token, newPassword} = req.payload;

  if (!token || !newPassword) {
    return h.response({error: "token and new password required"}).code(400);
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE resetToken = ? AND resetTokenExpire > NOW()', [token]);   
    
    if (users.length === 0) {
      return h.response({error: "invalid or expired token"}).code(400);
    }

    const user = users[0];

    const hashedPassword = await bcrypt.hash(newPassword,8);

    await db.query('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpire = NULL WHERE id = ?', [hashedPassword, user.id]);

    return h.response({message: "Reset Password Successfully"}).code(200);
  } 
  
  catch (error) {
    console.error("error confirming password reset: ", error);
    return h.response({error: "failde to confirm password reset"}).code(500);
  }
};

module.exports = {
  registerAccount,
  verifyOTP,
  loginUser,
  requestResetPassword,
  confirmResetPassword,
}