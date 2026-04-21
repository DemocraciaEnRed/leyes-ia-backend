import * as votePredictionService from '../services/votePrediction.js';

export const listPredictions = async (req, res) => {
  try {
    const predictions = await votePredictionService.getProjectPredictions({
      projectId: req.params.projectId,
    });

    return res.status(200).json({ predictions });
  } catch (error) {
    console.error('votePredictionController.listPredictions error:', error);
    return res.status(500).json({ message: 'Error al obtener predicciones' });
  }
};

export const generateTheoretical = async (req, res) => {
  try {
    const predictions = await votePredictionService.generateTheoreticalPredictions({
      projectId: req.params.projectId,
      userId: req.user?.id,
    });

    return res.status(200).json({
      predictions,
      message: `Se generaron ${predictions.length} predicciones teóricas`,
    });
  } catch (error) {
    console.error('votePredictionController.generateTheoretical error:', error);
    if (error.message === 'No hay partidos políticos activos con perfil generado') {
      return res.status(422).json({ message: error.message });
    }
    if (error.message === 'El proyecto no tiene archivo principal') {
      return res.status(422).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error al generar predicciones teóricas' });
  }
};

export const generateContextual = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;

    const prediction = await votePredictionService.generateContextualPrediction({
      predictionId: req.params.predictionId,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      userId: req.user?.id,
    });

    return res.status(200).json({ prediction });
  } catch (error) {
    console.error('votePredictionController.generateContextual error:', error);
    if (error.message === 'Predicción no encontrada') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'La predicción teórica aún no fue generada') {
      return res.status(422).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error al generar predicción contextual' });
  }
};

export const regenerateAll = async (req, res) => {
  try {
    const predictions = await votePredictionService.regenerateAllPredictions({
      projectId: req.params.projectId,
      userId: req.user?.id,
    });

    return res.status(200).json({
      predictions,
      message: `Se regeneraron ${predictions.length} predicciones`,
    });
  } catch (error) {
    console.error('votePredictionController.regenerateAll error:', error);
    return res.status(500).json({ message: 'Error al regenerar predicciones' });
  }
};

export const getPublicPredictions = async (req, res) => {
  try {
    const result = await votePredictionService.getPublicProjectPredictions({
      projectSlug: req.params.projectSlug,
    });

    if (!result) {
      return res.status(404).json({ message: 'Proyecto no encontrado o no publicado' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('votePredictionController.getPublicPredictions error:', error);
    return res.status(500).json({ message: 'Error al obtener predicciones públicas' });
  }
};
