export async function up({ context: queryInterface }) {
  await queryInterface.bulkInsert('Configs', [
    {
      key: 'votePredictionDisclaimer',
      type: 'string',
      value: 'Las predicciones de voto son generadas por inteligencia artificial con fines orientativos y lúdicos. No representan una predicción exacta ni definitiva del comportamiento legislativo. Están basadas en el análisis de plataformas electorales y fuentes públicas verificables, y no deben interpretarse como una calificación de partidos políticos ni como una verdad absoluta.',
    },
  ]);
}

export async function down({ context: queryInterface }) {
  await queryInterface.bulkDelete('Configs', { key: 'votePredictionDisclaimer' });
}
