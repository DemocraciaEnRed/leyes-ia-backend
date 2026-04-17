import express from 'express';
import { check } from 'express-validator';
import validate from '../../middlewares/validate.js';
import * as legislatorController from '../../controllers/legislatorController.js';

const router = express.Router();

// -----------------------------------------------
// BASE   /admin/legislators
// -----------------------------------------------

const createValidation = [
	check('firstName').notEmpty().withMessage('El nombre es requerido'),
	check('lastName').notEmpty().withMessage('El apellido es requerido'),
	check('chamber').isIn(['deputies', 'senators']).withMessage('La cámara debe ser deputies o senators'),
	check('externalSource').optional({ values: 'falsy' }).isIn(['hcdn', 'senado', 'other']).withMessage('Fuente externa inválida'),
	check('provinceId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('ID de provincia inválido'),
	check('email').optional({ values: 'falsy' }).isEmail().withMessage('Email inválido'),
	check('termStart').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha de inicio de mandato inválida'),
	check('termEnd').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha de fin de mandato inválida'),
	check('active').optional().isBoolean().withMessage('El campo activo debe ser booleano'),
];

const updateValidation = [
	check('firstName').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
	check('lastName').optional().notEmpty().withMessage('El apellido no puede estar vacío'),
	check('chamber').optional().isIn(['deputies', 'senators']).withMessage('La cámara debe ser deputies o senators'),
	check('externalSource').optional({ values: 'falsy' }).isIn(['hcdn', 'senado', 'other']).withMessage('Fuente externa inválida'),
	check('provinceId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('ID de provincia inválido'),
	check('email').optional({ values: 'falsy' }).isEmail().withMessage('Email inválido'),
	check('termStart').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha de inicio de mandato inválida'),
	check('termEnd').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha de fin de mandato inválida'),
	check('active').optional().isBoolean().withMessage('El campo activo debe ser booleano'),
];

router.get('/', legislatorController.list);
router.get('/:id', legislatorController.getById);
router.post('/', createValidation, validate, legislatorController.create);
router.put('/:id', updateValidation, validate, legislatorController.update);
router.patch('/:id/activate', legislatorController.activate);
router.patch('/:id/deactivate', legislatorController.deactivate);
router.delete('/:id', legislatorController.remove);

export default router;
