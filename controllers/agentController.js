import { client } from '../services/gradient.js';

export const getAgents = async (req, res) => {
	try {
		const agents = await client.agents.list();
		return res.status(200).json({ agents });
	} catch (error) {
		console.error('Error fetching agents:', error);
		return res.status(500).json({ error: error?.message || String(error) });
	}
}

export const getAgentById = async (req, res) => {
	const { id } = req.params;
	try {
		const agent = await client.agents.retrieve(id);
		return res.status(200).json({ agent });
	} catch (error) {
		console.error(`Error fetching agent with id ${id}:`, error);
		return res.status(500).json({ error: error?.message || String(error) });
	}
}
