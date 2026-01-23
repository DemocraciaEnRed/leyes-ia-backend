import agentsRoutes from './agents.js';
import knowledgeBasesRoutes from './knowledgeBases.js';
import projectsRoutes from './projects/index.js';
import utilsRoutes from './utils.js';
import testRoutes from './test.js';

export default function routes(app) {
	// define all the routes
	app.get('/', (req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	app.use('/agents', agentsRoutes);
	app.use('/knowledge-bases', knowledgeBasesRoutes);
	app.use('/projects', projectsRoutes);
	app.use('/utils', utilsRoutes);
	app.use('/test', testRoutes);
}