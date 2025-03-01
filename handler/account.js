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

// const {generateToken} = require('../utils/auth');

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

    // const token = generateToken(user[0]);

    // return h.response({
    //   message: "login successfully",
    //   token,
    // }).code(200);

    return h.response({
      message: "login successfully"
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
  const { email } = req.payload;

  if (!email) {
    return h.response({ error: "Email is required" }).code(400);
  }

  try {
    // Cek apakah user dengan email tersebut ada
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return h.response({ error: "Account not found" }).code(400);
    }

    // Generate OTP 6 karakter (kombinasi angka dan huruf)
    const resetToken = generateResetToken(6); 

    // Simpan OTP ke tabel otp_verification
    await db.query(
      `INSERT INTO otp_verification (email, otp, type, expires_at, request_reset_password, otp_verified)
       VALUES (?, ?, 'password_reset', DATE_ADD(NOW(), INTERVAL 15 MINUTE), TRUE, FALSE)`,
      [email, resetToken]
    );

    // Kirim email ke pengguna
    const mailOptions = {
      from: process.env.EMAIL_ADMIN,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your password reset OTP is: ${resetToken}. This OTP is valid for 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    return h.response({ message: "Reset OTP sent successfully" }).code(200);
  } catch (error) {
    console.error("Error sending reset password OTP", error);
    return h.response({ error: "Failed to send reset password OTP" }).code(500);
  }
};

const verifyResetToken = async (req, h) => {
  const { email, otp } = req.payload;

  if (!email || !otp) {
    return h.response({ error: "Email and OTP are required" }).code(400);
  }

  try {
    // Cek apakah OTP valid dan belum kadaluarsa
    const [otpRecords] = await db.query(
      `SELECT * FROM otp_verification 
       WHERE email = ? AND otp = ? AND type = 'password_reset' 
       AND expires_at > NOW() AND request_reset_password = TRUE`,
      [email, otp]
    );

    if (otpRecords.length === 0) {
      return h.response({ error: "Invalid or expired OTP" }).code(400);
    }

    // OTP valid, ubah request_reset_password ke FALSE dan otp_verified ke TRUE
    await db.query(
      `UPDATE otp_verification 
       SET request_reset_password = FALSE, otp_verified = TRUE 
       WHERE email = ? AND otp = ?`,
      [email, otp]
    );

    return h.response({ message: "OTP verified successfully" }).code(200);
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return h.response({ error: "Failed to verify OTP" }).code(500);
  }
};

const resetPassword = async (req, h) => {
  const { email, newPassword } = req.payload;

  if (!email || !newPassword) {
    return h.response({ error: "Email and new password are required" }).code(400);
  }

  try {
    // Cek apakah OTP sudah diverifikasi
    const [otpRecords] = await db.query(
      `SELECT * FROM otp_verification 
       WHERE email = ? AND type = 'password_reset' 
       AND otp_verified = TRUE AND request_reset_password = FALSE`,
      [email]
    );

    if (otpRecords.length === 0) {
      return h.response({ error: "OTP not verified or invalid request" }).code(400);
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 8);

    // Update password di tabel users
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

    // Hapus OTP dari tabel otp_verification
    await db.query('DELETE FROM otp_verification WHERE email = ? AND type = "password_reset"', [email]);

    return h.response({ message: "Password reset successfully" }).code(200);
  } catch (error) {
    console.error("Error resetting password:", error);
    return h.response({ error: "Failed to reset password" }).code(500);
  }
};

module.exports = {
  registerAccount,
  verifyOTP,
  loginUser,
  requestResetPassword,
  verifyResetToken,
  resetPassword,
}