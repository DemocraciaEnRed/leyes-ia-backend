import express from 'express';
import { check } from 'express-validator';
import validate from '../../middlewares/validate.js';
import upload from '../../services/multer.js';
import * as politicalPartyController from '../../controllers/politicalPartyController.js';

const router = express.Router();

// -----------------------------------------------
// BASE   /admin/political-parties
// -----------------------------------------------

const createValidation = [
  check('name').notEmpty().withMessage('El nombre es requerido'),
  check('slug').notEmpty().withMessage('El slug es requerido')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('El slug debe contener solo letras minúsculas, números y guiones'),
  check('shortName').optional({ values: 'falsy' }).isString().withMessage('El nombre corto debe ser texto'),
  check('status').optional().isIn(['draft', 'active', 'archived']).withMessage('El estado debe ser draft, active o archived'),
];

const updateValidation = [
  check('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  check('slug').optional().notEmpty().withMessage('El slug no puede estar vacío')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('El slug debe contener solo letras minúsculas, números y guiones'),
  check('shortName').optional({ values: 'falsy' }).isString().withMessage('El nombre corto debe ser texto'),
  check('status').optional().isIn(['draft', 'active', 'archived']).withMessage('El estado debe ser draft, active o archived'),
  check('profileSummary').optional({ values: 'falsy' }).isString().withMessage('El perfil debe ser texto'),
];

const legislatorCreateValidation = [
  check('fullName').notEmpty().withMessage('El nombre completo es requerido'),
  check('chamber').optional({ values: 'falsy' }).isIn(['senators', 'deputies']).withMessage('La cámara debe ser senators o deputies'),
  check('provinceId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('ID de provincia inválido'),
];

const legislatorUpdateValidation = [
  check('fullName').optional().notEmpty().withMessage('El nombre completo no puede estar vacío'),
  check('chamber').optional({ values: 'falsy' }).isIn(['senators', 'deputies']).withMessage('La cámara debe ser senators o deputies'),
  check('provinceId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('ID de provincia inválido'),
  check('status').optional().isIn(['active', 'inactive']).withMessage('El estado debe ser active o inactive'),
];

// Party CRUD
router.get('/', politicalPartyController.list);
router.post('/', createValidation, validate, politicalPartyController.create);
router.get('/:partyId', politicalPartyController.getById);
router.patch('/:partyId', updateValidation, validate, politicalPartyController.update);
router.delete('/:partyId', politicalPartyController.archive);

// Party files
router.post('/:partyId/files', upload.single('partyFile'), politicalPartyController.uploadFile);
router.delete('/:partyId/files/:fileId', politicalPartyController.deleteFile);

// Profile generation
router.post('/:partyId/generate-profile', politicalPartyController.generateProfile);

// Party legislators
router.get('/:partyId/legislators', politicalPartyController.listLegislators);
router.post('/:partyId/legislators', legislatorCreateValidation, validate, politicalPartyController.addLegislator);
router.patch('/:partyId/legislators/:legislatorId', legislatorUpdateValidation, validate, politicalPartyController.updateLegislator);
router.delete('/:partyId/legislators/:legislatorId', politicalPartyController.removeLegislator);

export default router;
