const handler = {
  account: require('../handler/account'),
  userData: require('../handler/user_data'),
  utils: require('../utils/middleware')
};

const routes = [
  {
    method: 'POST',
    path: '/register',
    handler: handler.account.registerAccount,
  },
  {
    method: 'POST',
    path: '/verify-otp',
    handler: handler.account.verifyOTP,
  },
  {
    method: 'POST',
    path: '/login',
    handler: handler.account.loginUser,
  },
  {
    method: 'POST',
    path: '/user_check',
    handler: handler.userData.checkUserData,
  },
  {
    method: 'POST',
    path: '/input_user_data',
    handler: handler.userData.inputUserData,
  },
  {
    method: 'GET',
    path: '/user/profile',
    handler: handler.userData.getUserData,  // Handler untuk ambil data user
    options: {
      auth: 'jwt'  // Middleware JWT
    }
  },
];

module.exports = routes;