import { checkOpenSearchConnection } from '../services/openSearchDB.js';
import model from '../models/index.js';

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

export const getProvinces = async (req, res) => {
    try {
        const provinces = await model.Province.findAll({
            where: { isActive: true },
            attributes: ['id', 'code', 'name'],
            order: [['sortOrder', 'ASC'], ['name', 'ASC']]
        });

        return res.status(200).json({
            provinces,
        });
    } catch (error) {
        console.error('Error fetching provinces:', error);
        return res.status(500).json({ ok: false, message: 'Internal server error' });
    }
}
