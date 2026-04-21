import { Op } from 'sequelize';
import model from '../models/index.js';

export const list = async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page, 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
		const offset = (page - 1) * limit;

		const where = {};

		if (req.query.chamber) {
			where.chamber = req.query.chamber;
		}

		if (req.query.active !== undefined && req.query.active !== '') {
			where.active = req.query.active === 'true';
		}

		if (req.query.provinceId) {
			const provinceId = parseInt(req.query.provinceId, 10);
			if (Number.isInteger(provinceId) && provinceId > 0) {
				where.provinceId = provinceId;
			}
		}

		if (req.query.search) {
			const search = `%${req.query.search}%`;
			where[Op.or] = [
				{ firstName: { [Op.like]: search } },
				{ lastName: { [Op.like]: search } },
			];
		}

		const { rows, count } = await model.Legislator.findAndCountAll({
			where,
			include: [
				{
					model: model.Province,
					as: 'province',
					attributes: ['id', 'name', 'code'],
				},
			],
			order: [['lastName', 'ASC'], ['firstName', 'ASC']],
			limit,
			offset,
		});

		return res.status(200).json({
			legislators: rows,
			pagination: {
				page,
				limit,
				total: count,
				totalPages: Math.ceil(count / limit),
			},
		});
	} catch (error) {
		console.error('legislatorController.list error:', error);
		return res.status(500).json({ message: 'Error al obtener legisladores' });
	}
};

export const getById = async (req, res) => {
	try {
		const legislator = await model.Legislator.findByPk(req.params.id, {
			include: [
				{
					model: model.Province,
					as: 'province',
					attributes: ['id', 'name', 'code'],
				},
			],
		});

		if (!legislator) {
			return res.status(404).json({ message: 'Legislador no encontrado' });
		}

		return res.status(200).json({ legislator });
	} catch (error) {
		console.error('legislatorController.getById error:', error);
		return res.status(500).json({ message: 'Error al obtener legislador' });
	}
};

export const create = async (req, res) => {
	try {
		const {
			firstName, lastName, chamber, provinceId, politicalPartyId,
			blockName, termStart, termEnd, photoUrl, email, active, metadata,
			externalId, externalSource,
		} = req.body;

		// Validate externalId/externalSource pairing
		if ((externalId && !externalSource) || (!externalId && externalSource)) {
			return res.status(422).json({
				message: 'Si se envía externalId, externalSource es requerido (y viceversa)',
			});
		}

		// Check uniqueness of externalId + externalSource
		if (externalId && externalSource) {
			const existing = await model.Legislator.findOne({
				where: { externalId, externalSource },
			});
			if (existing) {
				return res.status(409).json({
					message: 'Ya existe un legislador con ese externalId y externalSource',
				});
			}
		}

		// Validate provinceId exists
		if (provinceId) {
			const province = await model.Province.findByPk(provinceId, { attributes: ['id'] });
			if (!province) {
				return res.status(422).json({ message: 'La provincia especificada no existe' });
			}
		}

		// Validate term dates
		if (termStart && termEnd && termStart >= termEnd) {
			return res.status(422).json({
				message: 'La fecha de inicio del mandato debe ser anterior a la de fin',
			});
		}

		const legislator = await model.Legislator.create({
			firstName,
			lastName,
			chamber,
			provinceId: provinceId || null,
			politicalPartyId: politicalPartyId || null,
			blockName: blockName || null,
			termStart: termStart || null,
			termEnd: termEnd || null,
			photoUrl: photoUrl || null,
			email: email || null,
			active: active !== undefined ? active : true,
			metadata: metadata || null,
			externalId: externalId || null,
			externalSource: externalSource || null,
		});

		// Reload with province association
		const created = await model.Legislator.findByPk(legislator.id, {
			include: [
				{
					model: model.Province,
					as: 'province',
					attributes: ['id', 'name', 'code'],
				},
			],
		});

		return res.status(201).json({ legislator: created });
	} catch (error) {
		console.error('legislatorController.create error:', error);
		return res.status(500).json({ message: 'Error al crear legislador' });
	}
};

export const update = async (req, res) => {
	try {
		const legislator = await model.Legislator.findByPk(req.params.id);
		if (!legislator) {
			return res.status(404).json({ message: 'Legislador no encontrado' });
		}

		const {
			firstName, lastName, chamber, provinceId, politicalPartyId,
			blockName, termStart, termEnd, photoUrl, email, active, metadata,
			externalId, externalSource,
		} = req.body;

		// Determine effective values after update for validation
		const effectiveExternalId = externalId !== undefined ? externalId : legislator.externalId;
		const effectiveExternalSource = externalSource !== undefined ? externalSource : legislator.externalSource;

		// Validate externalId/externalSource pairing
		if ((effectiveExternalId && !effectiveExternalSource) || (!effectiveExternalId && effectiveExternalSource)) {
			return res.status(422).json({
				message: 'Si se envía externalId, externalSource es requerido (y viceversa)',
			});
		}

		// Check uniqueness of externalId + externalSource (excluding current record)
		if (effectiveExternalId && effectiveExternalSource) {
			const existing = await model.Legislator.findOne({
				where: {
					externalId: effectiveExternalId,
					externalSource: effectiveExternalSource,
					id: { [Op.ne]: legislator.id },
				},
			});
			if (existing) {
				return res.status(409).json({
					message: 'Ya existe un legislador con ese externalId y externalSource',
				});
			}
		}

		// Validate provinceId if provided
		if (provinceId !== undefined && provinceId !== null) {
			const province = await model.Province.findByPk(provinceId, { attributes: ['id'] });
			if (!province) {
				return res.status(422).json({ message: 'La provincia especificada no existe' });
			}
		}

		// Validate term dates
		const effectiveTermStart = termStart !== undefined ? termStart : legislator.termStart;
		const effectiveTermEnd = termEnd !== undefined ? termEnd : legislator.termEnd;
		if (effectiveTermStart && effectiveTermEnd && effectiveTermStart >= effectiveTermEnd) {
			return res.status(422).json({
				message: 'La fecha de inicio del mandato debe ser anterior a la de fin',
			});
		}

		// Build update payload (only provided fields)
		const updateData = {};
		if (firstName !== undefined) updateData.firstName = firstName;
		if (lastName !== undefined) updateData.lastName = lastName;
		if (chamber !== undefined) updateData.chamber = chamber;
		if (provinceId !== undefined) updateData.provinceId = provinceId || null;
		if (politicalPartyId !== undefined) updateData.politicalPartyId = politicalPartyId || null;
		if (blockName !== undefined) updateData.blockName = blockName || null;
		if (termStart !== undefined) updateData.termStart = termStart || null;
		if (termEnd !== undefined) updateData.termEnd = termEnd || null;
		if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
		if (email !== undefined) updateData.email = email || null;
		if (active !== undefined) updateData.active = active;
		if (metadata !== undefined) updateData.metadata = metadata || null;
		if (externalId !== undefined) updateData.externalId = externalId || null;
		if (externalSource !== undefined) updateData.externalSource = externalSource || null;

		await legislator.update(updateData);

		// Reload with province association
		const updated = await model.Legislator.findByPk(legislator.id, {
			include: [
				{
					model: model.Province,
					as: 'province',
					attributes: ['id', 'name', 'code'],
				},
			],
		});

		return res.status(200).json({ legislator: updated });
	} catch (error) {
		console.error('legislatorController.update error:', error);
		return res.status(500).json({ message: 'Error al actualizar legislador' });
	}
};

export const activate = async (req, res) => {
	try {
		const legislator = await model.Legislator.findByPk(req.params.id);
		if (!legislator) {
			return res.status(404).json({ message: 'Legislador no encontrado' });
		}

		await legislator.update({ active: true });
		return res.status(200).json({ message: 'Legislador activado', legislator });
	} catch (error) {
		console.error('legislatorController.activate error:', error);
		return res.status(500).json({ message: 'Error al activar legislador' });
	}
};

export const deactivate = async (req, res) => {
	try {
		const legislator = await model.Legislator.findByPk(req.params.id);
		if (!legislator) {
			return res.status(404).json({ message: 'Legislador no encontrado' });
		}

		await legislator.update({ active: false });
		return res.status(200).json({ message: 'Legislador desactivado', legislator });
	} catch (error) {
		console.error('legislatorController.deactivate error:', error);
		return res.status(500).json({ message: 'Error al desactivar legislador' });
	}
};

export const remove = async (req, res) => {
	try {
		const legislator = await model.Legislator.findByPk(req.params.id);
		if (!legislator) {
			return res.status(404).json({ message: 'Legislador no encontrado' });
		}

		// Future-proofed: check for associations before hard delete
		// When new tables reference Legislators, add checks here and return 409

		await legislator.destroy();
		return res.status(200).json({ message: 'Legislador eliminado' });
	} catch (error) {
		console.error('legislatorController.remove error:', error);
		return res.status(500).json({ message: 'Error al eliminar legislador' });
	}
};

export const listPublic = async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page, 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
		const offset = (page - 1) * limit;

		const where = { active: true };

		if (req.query.chamber) {
			where.chamber = req.query.chamber;
		}

		if (req.query.provinceId) {
			const provinceId = parseInt(req.query.provinceId, 10);
			if (Number.isInteger(provinceId) && provinceId > 0) {
				where.provinceId = provinceId;
			}
		}

		if (req.query.search) {
			const search = `%${req.query.search}%`;
			where[Op.or] = [
				{ firstName: { [Op.like]: search } },
				{ lastName: { [Op.like]: search } },
			];
		}

		const { rows, count } = await model.Legislator.findAndCountAll({
			where,
			attributes: ['id', 'firstName', 'lastName', 'fullName', 'chamber', 'photoUrl'],
			include: [
				{
					model: model.Province,
					as: 'province',
					attributes: ['id', 'name'],
				},
			],
			order: [['lastName', 'ASC'], ['firstName', 'ASC']],
			limit,
			offset,
		});

		return res.status(200).json({
			legislators: rows,
			pagination: {
				page,
				limit,
				total: count,
				totalPages: Math.ceil(count / limit),
			},
		});
	} catch (error) {
		console.error('legislatorController.listPublic error:', error);
		return res.status(500).json({ message: 'Error al obtener legisladores' });
	}
};
