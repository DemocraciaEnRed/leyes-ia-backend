
import { client } from '../services/gradient.js';
import s3Client from '../services/s3Client.js';

import model from '../models/index.js';

/**
 * List files in the project knowledge base, retrieving from S3
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const listProjectKnowledgeBaseFiles = async (req, res) => {
  const { projectId } = req.params;
  try {
    // Get the project knowledge base from the database
    const project = await model.Project.findByPk(projectId, {
      include: [{ model: model.KnowledgeBase, as: 'knowledgeBase' }]
    });
    const projectKnowledgeBase = project.knowledgeBase;
    if (!projectKnowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found for this project' });
    }

    // List files in the project knowledge base S3 bucket
    // Now we can upload the files to DigitalOcean Spaces
    const bucket = process.env.DIGITALOCEAN_SPACES_BUCKET
    const folder = `knowledge_bases/${project.code}-files/knowledge_base`;
    const prefix = `${folder}/`;
    const files = await s3Client.listFiles(bucket, prefix);
    return res.status(200).json({ files });
  } catch (error) {
    console.error('Error listing project knowledge base files:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
