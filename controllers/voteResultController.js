import * as voteResultService from '../services/voteResult.js';

export const uploadActa = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(422).json({ message: 'No se envió el archivo del acta' });
    }

    const result = await voteResultService.processActa({
      projectId: req.params.projectId,
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sourceUrl: req.body.sourceUrl || null,
      userId: req.user?.id,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('voteResultController.uploadActa error:', error);
    if (error.message === 'Ya existe un resultado de votación para este proyecto') {
      return res.status(422).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error al procesar acta de votación' });
  }
};

export const getResult = async (req, res) => {
  try {
    const voteResult = await voteResultService.getProjectVoteResult({
      projectId: req.params.projectId,
    });

    if (!voteResult) {
      return res.status(404).json({ message: 'No hay resultado de votación para este proyecto' });
    }

    return res.status(200).json({ voteResult });
  } catch (error) {
    console.error('voteResultController.getResult error:', error);
    return res.status(500).json({ message: 'Error al obtener resultado de votación' });
  }
};

export const getPublicResult = async (req, res) => {
  try {
    const voteResult = await voteResultService.getPublicProjectVoteResult({
      projectSlug: req.params.projectSlug,
    });

    if (!voteResult) {
      return res.status(404).json({ message: 'Resultado no encontrado' });
    }

    return res.status(200).json({ voteResult });
  } catch (error) {
    console.error('voteResultController.getPublicResult error:', error);
    return res.status(500).json({ message: 'Error al obtener resultado de votación' });
  }
};
