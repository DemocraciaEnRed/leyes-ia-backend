import { checkOpenSearchConnection } from '../services/openSearchDB.js';

// GET    /utils/check-opensearch
export const checkOpenSearch = async (req, res) => {
    try {
        await checkOpenSearchConnection();
        return res.status(200).json({ ok: true, message: 'OpenSearch cluster is up' });
    } catch (error) {
        console.error('OpenSearch cluster is down!', error);
        return res.status(500).json({ ok: false, message: 'OpenSearch cluster is down!' });
    }
}
