// import .env
import 'dotenv/config';

import helmet from 'helmet';
import cors from 'cors';
import db from './models/index.js';
import migrations from './services/migrations.js';
import express from 'express';
import passport from 'passport';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js'; // dependent on utc plugin
import configureJwt from './middlewares/jwt.js';


// Set up timezone argentina for dayjs
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(process.env.DEFAULT_TIMEZONE || 'America/Argentina/Buenos_Aires');

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
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// 
app.use(passport.initialize());
configureJwt(passport);

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
