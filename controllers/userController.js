import model from '../models/index.js';
import dayjs from 'dayjs';
import msg from '../utils/messages.js';

const ALLOWED_GENRES = ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'];

const normalizeDateOfBirth = (value) => {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmedValue = value.trim();
	if (!trimmedValue) {
		return null;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
		return null;
	}

	const parsed = dayjs(trimmedValue);
	if (!parsed.isValid()) {
		return null;
	}

	return parsed.format('YYYY-MM-DD');
};

const normalizeGenre = (value) => {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	if (!normalized || !ALLOWED_GENRES.includes(normalized)) {
		return null;
	}

	return normalized;
};

const normalizeDocumentNumber = (value) => {
	if (typeof value !== 'string' && typeof value !== 'number') {
		return null;
	}

	const normalized = String(value).trim();
	if (!/^\d+$/.test(normalized)) {
		return null;
	}

	return normalized;
};

export const getProfile = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		const user = await model.User.findByPk(req.user.id);
		if (!user) {
			return res.status(404).json({ message: msg.auth.error.userNotFound });
		}

		return res.status(200).json({ user: user.getUserSessionInfo() });
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}

export const updateProfile = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		const user = await model.User.findByPk(req.user.id);
		if (!user) {
			return res.status(404).json({ message: msg.auth.error.userNotFound });
		}

		const payload = req.body || {};
		const updates = {};
		const errors = [];
		const now = new Date();

		const profileFields = [
			{
				key: 'dateOfBirth',
				label: 'dateOfBirth',
				lockKey: 'dateOfBirthLockedAt',
				normalize: normalizeDateOfBirth,
				errorMessage: 'La fecha de nacimiento debe tener formato YYYY-MM-DD',
			},
			{
				key: 'genre',
				label: 'genre',
				lockKey: 'genreLockedAt',
				normalize: normalizeGenre,
				errorMessage: `El campo genre debe ser uno de: ${ALLOWED_GENRES.join(', ')}`,
			},
			{
				key: 'documentNumber',
				label: 'documentNumber',
				lockKey: 'documentNumberLockedAt',
				normalize: normalizeDocumentNumber,
				errorMessage: 'El número de documento debe contener solo dígitos',
			},
		];

		for (const fieldConfig of profileFields) {
			if (!Object.prototype.hasOwnProperty.call(payload, fieldConfig.key)) {
				continue;
			}

			const normalizedValue = fieldConfig.normalize(payload[fieldConfig.key]);
			if (!normalizedValue) {
				errors.push({
					field: fieldConfig.label,
					message: fieldConfig.errorMessage,
				});
				continue;
			}

			const currentValue = user[fieldConfig.key];
			const currentValueAsString = currentValue ? String(currentValue) : null;
			const isLocked = Boolean(user[fieldConfig.lockKey] || currentValue);

			if (isLocked) {
				if (currentValueAsString !== normalizedValue) {
					errors.push({
						field: fieldConfig.label,
						message: `${fieldConfig.label} ya fue definido y no puede modificarse`,
					});
				}
				continue;
			}

			updates[fieldConfig.key] = normalizedValue;
			updates[fieldConfig.lockKey] = now;
		}

		if (errors.length > 0) {
			return res.status(400).json({
				message: 'No se pudo actualizar el perfil',
				errors,
			});
		}

		if (Object.keys(updates).length > 0) {
			await user.update(updates);
		}

		return res.status(200).json({
			message: 'Perfil actualizado',
			user: user.getUserSessionInfo(),
		});
	} catch (error) {
		console.error(error)
		return res.status(500).json({ message: msg.error.default })
	}
}
