
import { client } from '../services/gradient.js';
import model from '../models/index.js';

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const checkProjectKnowledgeBaseReady = async (req, res) => {
  const { projectId } = req.params;
  try {
    // This is an example of the json that the Gradient API returns for a knowledge base:
    // {
    //   [...] 
    //   "knowledge_base": {
    //     "uuid": "123e4567-e89b-12d3-a456-426614174000"
    //     "created_at": "2023-01-01T00:00:00Z",
    //     "embedding_model_uuid": "123e4567-e89b-12d3-a456-426614174000",
    //     "last_indexing_job": {
    //       // [...] 
    //       "created_at": "2023-01-01T00:00:00Z",
    //       "started_at": "2023-01-01T00:00:00Z",
    //       "updated_at": "2023-01-01T00:00:00Z",
    //       "finished_at": "2023-01-01T00:00:00Z",
    //       "phase": "BATCH_JOB_PHASE_UNKNOWN",
    //       "status": "INDEX_JOB_STATUS_UNKNOWN",
    //       "total_datasources": 123,
    //       "total_tokens": "12345"
    //       // [...] 
    //     }
    //   [...] 
    // }

    // knowledge_base.last_indexing_job.phase can be:
    // "BATCH_JOB_PHASE_UNKNOWN"
    // "BATCH_JOB_PHASE_PENDING"
    // "BATCH_JOB_PHASE_RUNNING"
    // "BATCH_JOB_PHASE_SUCCEEDED"
    // "BATCH_JOB_PHASE_FAILED"
    // "BATCH_JOB_PHASE_ERROR"
    // "BATCH_JOB_PHASE_CANCELLED"

    // knowledge_base.last_indexing_job.status can be:
    // "INDEX_JOB_STATUS_UNKNOWN"
    // "INDEX_JOB_STATUS_PARTIAL"
    // "INDEX_JOB_STATUS_IN_PROGRESS"
    // "INDEX_JOB_STATUS_COMPLETED"
    // "INDEX_JOB_STATUS_FAILED"
    // "INDEX_JOB_STATUS_NO_CHANGES" (equals "INDEX_JOB_STATUS_COMPLETED" with no changes detected)
    // "INDEX_JOB_STATUS_PENDING"
    // "INDEX_JOB_STATUS_CANCELLED"
    // ------------------------------
    const project = await model.Project.findByPk(projectId, {
      include: [{ model: model.KnowledgeBase, as: 'knowledgeBase' }]
    });
    const projectKnowledgeBase = project.knowledgeBase;
    if (!projectKnowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found for this project' });
    }
    const knowledgeBaseResponse = await client.knowledgeBases.retrieve(projectKnowledgeBase.uuid);
    const knowledgeBase = knowledgeBaseResponse.knowledge_base;
    let isReady = false;
    if (knowledgeBase.last_indexing_job) {
      const phase = knowledgeBase.last_indexing_job.phase;
      const status = knowledgeBase.last_indexing_job.status;
      if (phase === 'BATCH_JOB_PHASE_SUCCEEDED' && (status === 'INDEX_JOB_STATUS_COMPLETED' || status === 'INDEX_JOB_STATUS_NO_CHANGES')) {
        isReady = true;
      }
    }
    projectKnowledgeBase.status = knowledgeBase.last_indexing_job ? knowledgeBase.last_indexing_job.status : 'INDEX_JOB_STATUS_UNKNOWN';
    projectKnowledgeBase.lastAPIResponse = knowledgeBase;
    projectKnowledgeBase.lastAPIResponseAt = new Date();
    await projectKnowledgeBase.save();

    // filter out only the necessary info
    const knowledgeBaseInfo = {
      uuid: knowledgeBase.uuid,
      created_at: knowledgeBase.created_at,
      embedding_model_uuid: knowledgeBase.embedding_model_uuid,
      last_indexing_job: {
        created_at: knowledgeBase.last_indexing_job?.created_at,
        started_at: knowledgeBase.last_indexing_job?.started_at,
        updated_at: knowledgeBase.last_indexing_job?.updated_at,
        finished_at: knowledgeBase.last_indexing_job?.finished_at,
        phase: knowledgeBase.last_indexing_job?.phase,
        status: knowledgeBase.last_indexing_job?.status,
        total_datasources: knowledgeBase.last_indexing_job?.total_datasources,
        total_tokens: knowledgeBase.last_indexing_job?.total_tokens,
      }
    };

    return res.status(200).json({ ready: isReady, knowledgeBase: knowledgeBaseInfo });
  } catch (error) {
    console.error('Error checking knowledge base status:', error);  
    return res.status(500).json({ error: error?.message || String(error) });
  }
}

export const getStatusProjectKnowledgeBase = async (req, res) => {
  const { projectId } = req.params;
  console.log('Getting status for project ID:', projectId);
  try {
    const project = await model.Project.findByPk(projectId, {
      include: [{ model: model.KnowledgeBase, as: 'knowledgeBase' }]
    });
    console.log('Fetched project:', project);
    const knowledgeBaseResponse = await client.knowledgeBases.retrieve(project.knowledgeBase.uuid);
    return res.status(200).json(knowledgeBaseResponse.knowledge_base);
  } catch (error) {
    console.error('Error fetching knowledge base status:', error);  
    return res.status(500).json({ error: error?.message || String(error) });
  }
}

export const retrieveProjectKnowledgeBase = async (req, res) => {
  const { projectId } = req.params;
  const { query } = req.body;

  try {
    const project = await model.Project.findByPk(projectId, {
      include: [{ model: model.KnowledgeBase, as: 'knowledgeBase' }]
    });
    const knowledgeBase = project.knowledgeBase;
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found for this project' });
    }

    // we need to make an http request to DIGITALOCEAN_KNOWLEDBE_BASE_QUERY_ENDPOINT
    // ex. https://kbaas.do-ai.run/v1/904d6b6f-e819-11f0-b074-4e013e2ddde4/retrieve


    // query: Specifies the search query string.
    // num_results: Defines the number between 0 and 100 of results to return.
    // alpha: Controls the hybrid search weighting at 0 to 1.
    // filters: Optionally applies filter rules to chunk metadata.
    const knowledgeBaseRetrievalUrl = `${process.env.DIGITALOCEAN_KNOWLEDGE_BASE_RETRIEVE_ENDPOINT}${knowledgeBase.uuid}/retrieve`;
    const response = await fetch(knowledgeBaseRetrievalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DIGITALOCEAN_PERSONAL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        query: query,
        num_results: 5,
        alpha: 0.5
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from knowledge base query endpoint:', errorText);
      return res.status(500).json({ error: 'Error querying knowledge base' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error querying knowledge base:', error);  
    return res.status(500).json({ error: error?.message || String(error) });
  }
}

