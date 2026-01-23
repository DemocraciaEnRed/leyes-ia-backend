import { Client } from '@opensearch-project/opensearch';

const openSearchClient = new Client({
    node: 'https://' + process.env.OPENSEARCH_NODE_URL + ':' + process.env.OPENSEARCH_NODE_PORT,
    auth: {
        username: process.env.OPENSEARCH_USERNAME,
        password: process.env.OPENSEARCH_PASSWORD
    }
});

// check connection

export const checkOpenSearchConnection = async () => {
  try {
    await openSearchClient.ping();
    console.log('OpenSearch cluster is up');
    return true;
  } catch (error) {
    console.error('OpenSearch cluster is down!', error);
    return false
  }
}

export default {
  openSearchClient,
  checkOpenSearchConnection
};