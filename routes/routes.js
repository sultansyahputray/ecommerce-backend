const handler = {
  account: require('../handler/account'),
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
];

module.exports = routes;