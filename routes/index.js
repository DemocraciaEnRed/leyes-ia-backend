import agentsRoutes from './agents.js';
import knowledgeBasesRoutes from './knowledgeBases.js';
import projectsRoutes from './projects/index.js';
import hubProjectsRoutes from './hub/projects.js';
import utilsRoutes from './utils.js';
import testRoutes from './test.js';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import usersRoutes from './users.js';
import demoRoutes from './demo.js';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';

export default function routes(app) {
	// define all the routes
	app.get('/', (req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	app.use('/auth', authRoutes);
	app.use('/users', usersRoutes);
	app.use('/agents', authenticate, authorize('admin'), agentsRoutes);
	app.use('/knowledge-bases', authenticate, authorize('admin'), knowledgeBasesRoutes);
	app.use('/hub/projects', hubProjectsRoutes);
	app.use('/projects', projectsRoutes);
	app.use('/admin', adminRoutes);
	app.use('/utils', utilsRoutes);
	app.use('/demo', demoRoutes);

	if (process.env.NODE_ENV !== 'production') {
		app.use('/test', testRoutes);
	}
}