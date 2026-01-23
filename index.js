// import .env
import 'dotenv/config';

import helmet from 'helmet';
import cors from 'cors';
//const passport = require('passport');
import db from './models/index.js';
import migrations from './services/migrations.js';
import express from 'express';

// Setting up port
let PORT = process.env.APP_PORT || 4000;

//=== 1 - CREATE APP
// Creating express app and configuring middleware needed for authentication
const app = express();


// Adding Helmet to enhance API's security
app.use(helmet());

// enabling CORS for all requests
let appOrigins = ['http://localhost:3000']
if(process.env.APP_URL){
	appOrigins = process.env.APP_URL.split(',')
}

app.use(cors({
	origin: appOrigins,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
	// allow content disposition for file download
	exposedHeaders: ['Content-Disposition'],
	credentials: true
}));

// Adding middleware to parse all incoming requests as JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//app.use(passport.initialize());
//(await import('./middlewares/jwt.js')).default(passport);

import routes from './routes/index.js';
routes(app);


async function assertDatabaseConnectionOk() {
	console.log(`- Checking database connection...`);
	try {
		await db.sequelize.authenticate();
		console.log('- Database connection OK!');
	} catch (error) {
		console.log('- Unable to connect to the database:');
		console.log(error.message);
		process.exit(1);
	}
} 

async function init() {

	// Check database connection
  await assertDatabaseConnectionOk();

  // Checking migrations
	await migrations.checkPendingMigrations();
	// Run Migrations (if any)
	await migrations.migrate();

  //=== 5 - START SERVER
  app.listen(PORT, () => console.log('- Server running on http://localhost:' + PORT + '/'));

}

init();
