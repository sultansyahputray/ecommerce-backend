const db = require('../utils/db');

const checkUserData = async (req, h) => {
  const {email} = req.payload;

  if (!email) {
    return h.response({error: "email required"}).code(400);
  }

  try {
    const [user] = await db.query('SELECT gender, birthdate, phone, profile_status FROM users WHERE email = ?', [email]);
    
    if (user.length === 0) {
      return h.response({error: "user data not found"}).code(400);
    }

    return h.response({
      message: "user data checked",
      profile_status: user[0].profile_status
    }).code(200);
  } 
  
  catch (error) {
    console.error("error while checking user data: ", error);
    return h.response({error: "failed to check user data"}).code(500);
  }
};

const inputUserData = async (req, h) => {
  const {email, gender, birthdate, phone} = req.payload;

  if (!email || !gender || !birthdate || !phone) {
    return h.response({error: "all requirement need filled"}).code(400);
  }

  try {
    const [existingUser] = await db.query('SELECT email from users WHERE email = ?', [email]);

    if (existingUser.length === 0) {
      return h.response({error: "user not found"}).code(400);
    }

    await db.query(
      'UPDATE users SET gender = ?, birthdate = ?, phone = ?, profile_status = "complete" WHERE email = ?',
      [gender, birthdate, phone, email]
    );  

    return h.response({message: "user data input successfully"}).code(200);
  } 
  
  catch (error) {
    console.error("error while input user data:", error);
    return h.response({error: "failed to input user data"}).code(500);
  }
};

const getUserData = async (req, h) => {
  try {
    console.log("Decoded JWT Payload:", req.auth.credentials);

    const {email} = req.auth.credentials;

    if (!email) {
      return h.response({ error: "Unauthorized. No email found in token." }).code(401);
    }

    const [user] = await db.query('SELECT name, email, gender, birthdate, phone FROM users WHERE email = ?', [email]);

    if (user.length === 0) {
      return h.response({error: "user not found"}).code(400);
    }

    return h.response({message: "user data retrieved", user: user[0]}).code(200);
  } 
  
  catch (error) {
    console.error("error fetching user data", error);
    return h.response({error: "failed to fetch user data"}).code(500);
  }
};

module.exports = {
  checkUserData,
  inputUserData,
  getUserData,
}