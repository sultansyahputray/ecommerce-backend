const Hapi = require('@hapi/hapi');
// const jwt = require('@hapi/jwt');
const routes = require('./routes/routes');
require('dotenv').config();

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: process.env.HOST || 'localhost',
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  // await server.register(jwt);

  // server.auth.strategy('jwt', 'jwt', {
  //   keys: process.env.JWT_SECRET,
  //   verify: { 
  //     aud: false, 
  //     iss: false, 
  //     sub: false,
  //     maxAgeSec: 3600, // wakti token berlaku (detik)
  //   },
  //   validate: (artifacts, request, h) => {
  //     return { isValid: true, credentials: artifacts.decoded.payload };
  //   }
  // });

  // server.auth.default('jwt');

  server.route(routes);

  await server.start();
  console.log(`server running at ${server.info.uri}`);
}

init();