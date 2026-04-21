import { Op } from 'sequelize';
import model from '../models/index.js';
import s3Client from '../services/s3Client.js';
import { generateProfile as generateProfileService } from '../services/politicalPartyProfile.js';

const S3_PARTY_FILES_PREFIX = 'political_parties';

const getS3Key = (partySlug, fileName) => {
  return `${S3_PARTY_FILES_PREFIX}/${partySlug}/${fileName}`;
};

export const list = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.search) {
      const search = `%${req.query.search}%`;
      where[Op.or] = [
        { name: { [Op.like]: search } },
        { shortName: { [Op.like]: search } },
      ];
    }

    const { rows, count } = await model.PoliticalParty.findAndCountAll({
      where,
      attributes: {
        include: [
          [model.sequelize.literal('(SELECT COUNT(*) FROM `PoliticalPartyFiles` WHERE `PoliticalPartyFiles`.`politicalPartyId` = `PoliticalParty`.`id`)'), 'filesCount'],
        ],
      },
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    return res.status(200).json({
      parties: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('politicalPartyController.list error:', error);
    return res.status(500).json({ message: 'Error al obtener partidos políticos' });
  }
};

export const getById = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findByPk(req.params.partyId, {
      include: [
        {
          model: model.PoliticalPartyFile,
          as: 'files',
          attributes: ['id', 'type', 'name', 'size', 'mimeType', 's3Key', 'createdAt'],
        },
      ],
    });

    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    return res.status(200).json({ party });
  } catch (error) {
    console.error('politicalPartyController.getById error:', error);
    return res.status(500).json({ message: 'Error al obtener partido político' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, slug, shortName, status } = req.body;

    const existingSlug = await model.PoliticalParty.findOne({ where: { slug } });
    if (existingSlug) {
      return res.status(422).json({ message: 'El slug ya está en uso' });
    }

    const party = await model.PoliticalParty.create({
      name,
      slug,
      shortName: shortName || null,
      status: status || 'draft',
    });

    return res.status(201).json({ party });
  } catch (error) {
    console.error('politicalPartyController.create error:', error);
    return res.status(500).json({ message: 'Error al crear partido político' });
  }
};

export const update = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findByPk(req.params.partyId);
    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    const { name, slug, shortName, status, profileSummary } = req.body;

    if (slug && slug !== party.slug) {
      const existingSlug = await model.PoliticalParty.findOne({ where: { slug, id: { [Op.ne]: party.id } } });
      if (existingSlug) {
        return res.status(422).json({ message: 'El slug ya está en uso' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (shortName !== undefined) updateData.shortName = shortName || null;
    if (status !== undefined) updateData.status = status;
    if (profileSummary !== undefined) updateData.profileSummary = profileSummary;

    await party.update(updateData);

    return res.status(200).json({ party });
  } catch (error) {
    console.error('politicalPartyController.update error:', error);
    return res.status(500).json({ message: 'Error al actualizar partido político' });
  }
};

export const archive = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findByPk(req.params.partyId);
    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    await party.update({ status: 'archived' });

    return res.status(200).json({ party });
  } catch (error) {
    console.error('politicalPartyController.archive error:', error);
    return res.status(500).json({ message: 'Error al archivar partido político' });
  }
};

// --- File management ---

export const uploadFile = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findByPk(req.params.partyId);
    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    const file = req.file;
    if (!file) {
      return res.status(422).json({ message: 'No se envió ningún archivo' });
    }

    const fileType = req.body.fileType || 'platform';
    const s3Key = getS3Key(party.slug, `${Date.now()}-${file.originalname}`);

    await s3Client.uploadFile(s3Key, file.buffer, 'private', file.mimetype);

    const partyFile = await model.PoliticalPartyFile.create({
      politicalPartyId: party.id,
      type: fileType,
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      s3Bucket: process.env.DIGITALOCEAN_SPACES_BUCKET,
      s3Key,
    });

    return res.status(201).json({ file: partyFile });
  } catch (error) {
    console.error('politicalPartyController.uploadFile error:', error);
    return res.status(500).json({ message: 'Error al subir archivo' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const partyFile = await model.PoliticalPartyFile.findOne({
      where: {
        id: req.params.fileId,
        politicalPartyId: req.params.partyId,
      },
    });

    if (!partyFile) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    await partyFile.destroy();

    return res.status(200).json({ message: 'Archivo eliminado' });
  } catch (error) {
    console.error('politicalPartyController.deleteFile error:', error);
    return res.status(500).json({ message: 'Error al eliminar archivo' });
  }
};

// --- Party legislators management ---

export const listLegislators = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findByPk(req.params.partyId);
    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    const legislators = await model.PoliticalPartyLegislator.findAll({
      where: { politicalPartyId: party.id },
      include: [
        {
          model: model.Province,
          as: 'province',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['fullName', 'ASC']],
    });

    return res.status(200).json({ legislators });
  } catch (error) {
    console.error('politicalPartyController.listLegislators error:', error);
    return res.status(500).json({ message: 'Error al obtener legisladores del partido' });
  }
};

export const addLegislator = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findByPk(req.params.partyId);
    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    const { fullName, chamber, provinceId, photoUrl } = req.body;

    const legislator = await model.PoliticalPartyLegislator.create({
      politicalPartyId: party.id,
      fullName,
      chamber: chamber || null,
      provinceId: provinceId || null,
      photoUrl: photoUrl || null,
    });

    return res.status(201).json({ legislator });
  } catch (error) {
    console.error('politicalPartyController.addLegislator error:', error);
    return res.status(500).json({ message: 'Error al agregar legislador' });
  }
};

export const updateLegislator = async (req, res) => {
  try {
    const legislator = await model.PoliticalPartyLegislator.findOne({
      where: {
        id: req.params.legislatorId,
        politicalPartyId: req.params.partyId,
      },
    });

    if (!legislator) {
      return res.status(404).json({ message: 'Legislador no encontrado' });
    }

    const { fullName, chamber, provinceId, photoUrl, status } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (chamber !== undefined) updateData.chamber = chamber || null;
    if (provinceId !== undefined) updateData.provinceId = provinceId || null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
    if (status !== undefined) updateData.status = status;

    await legislator.update(updateData);

    return res.status(200).json({ legislator });
  } catch (error) {
    console.error('politicalPartyController.updateLegislator error:', error);
    return res.status(500).json({ message: 'Error al actualizar legislador' });
  }
};

export const removeLegislator = async (req, res) => {
  try {
    const legislator = await model.PoliticalPartyLegislator.findOne({
      where: {
        id: req.params.legislatorId,
        politicalPartyId: req.params.partyId,
      },
    });

    if (!legislator) {
      return res.status(404).json({ message: 'Legislador no encontrado' });
    }

    await legislator.destroy();

    return res.status(200).json({ message: 'Legislador eliminado del partido' });
  } catch (error) {
    console.error('politicalPartyController.removeLegislator error:', error);
    return res.status(500).json({ message: 'Error al eliminar legislador del partido' });
  }
};

// --- Profile generation (AI) ---

export const generateProfile = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findByPk(req.params.partyId, {
      include: [{
        model: model.PoliticalPartyFile,
        as: 'files',
      }],
    });

    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    if (!party.files || party.files.length === 0) {
      return res.status(422).json({ message: 'El partido no tiene archivos cargados. Suba al menos un PDF de plataforma electoral.' });
    }

    const { expandWithSearch } = req.body;

    const result = await generateProfileService({
      partyId: party.id,
      expandWithSearch: !!expandWithSearch,
      userId: req.user?.id,
    });

    const { recordProjectAiUsageEvent } = await import('../services/aiUsageAudit.js');
    await recordProjectAiUsageEvent({
      projectId: null,
      userId: req.user?.id,
      action: 'political_party_profile_generate',
      model: 'gemini-2.5-flash',
      geminiResponse: result.geminiResponse,
      latencyMs: result.latencyMs,
    });

    return res.status(200).json({
      profileSummary: result.profileSummary,
      profileExpandedWithSearch: !!expandWithSearch,
      profileGeneratedAt: result.party.profileGeneratedAt,
    });
  } catch (error) {
    console.error('politicalPartyController.generateProfile error:', error);
    return res.status(500).json({ message: 'Error al generar perfil del partido' });
  }
};

// --- Public hub endpoints ---

export const getPublicPartyLegislators = async (req, res) => {
  try {
    const party = await model.PoliticalParty.findOne({
      where: { slug: req.params.partySlug, status: 'active' },
      attributes: ['id', 'name', 'slug', 'shortName', 'logoUrl'],
    });

    if (!party) {
      return res.status(404).json({ message: 'Partido político no encontrado' });
    }

    const legislators = await model.PoliticalPartyLegislator.findAll({
      where: { politicalPartyId: party.id, status: 'active' },
      include: [{ model: model.Province, as: 'province', attributes: ['id', 'name'] }],
      order: [['fullName', 'ASC']],
    });

    return res.status(200).json({ party, legislators });
  } catch (error) {
    console.error('politicalPartyController.getPublicPartyLegislators error:', error);
    return res.status(500).json({ message: 'Error al obtener legisladores del partido' });
  }
};

export const listActiveParties = async (req, res) => {
  try {
    const parties = await model.PoliticalParty.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'slug', 'shortName', 'logoUrl'],
      order: [['name', 'ASC']],
    });

    return res.status(200).json({ parties });
  } catch (error) {
    console.error('politicalPartyController.listActiveParties error:', error);
    return res.status(500).json({ message: 'Error al obtener partidos políticos' });
  }
};


