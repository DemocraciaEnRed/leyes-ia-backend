import { client } from '../services/gradient.js';

export const getKnowledgeBases = async (req, res) => {
  try {

    const knowledgeBases = await client.knowledgeBases.list();
    return res.status(200).json(knowledgeBases);
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}

export const getKnowledgeBaseById = async (req, res) => {
  const { id } = req.params;
  try {
    const knowledgeBase = await client.knowledgeBases.get(id);
    return res.status(200).json(knowledgeBase);
  } catch (error) {
    console.error('Error fetching knowledge base by ID:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}