const Hapi = require('@hapi/hapi');
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

  server.route(routes);

  await server.start();
  console.log(`server running at ${server.info.uri}`);
}

init();