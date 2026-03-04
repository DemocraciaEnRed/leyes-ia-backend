export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    UPDATE Users
    SET genre = CASE genre
      WHEN 'male' THEN 'masculino'
      WHEN 'female' THEN 'femenino'
      WHEN 'non_binary' THEN 'no_binario'
      WHEN 'other' THEN 'otro'
      WHEN 'prefer_not_to_say' THEN 'prefiero_no_decir'
      ELSE genre
    END
    WHERE genre IN ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say');
  `);

  await queryInterface.sequelize.query(`
    UPDATE ProjectSurveyAnswers
    SET genre = CASE genre
      WHEN 'male' THEN 'masculino'
      WHEN 'female' THEN 'femenino'
      WHEN 'non_binary' THEN 'no_binario'
      WHEN 'other' THEN 'otro'
      WHEN 'prefer_not_to_say' THEN 'prefiero_no_decir'
      ELSE genre
    END
    WHERE genre IN ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say');
  `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    UPDATE Users
    SET genre = CASE genre
      WHEN 'masculino' THEN 'male'
      WHEN 'femenino' THEN 'female'
      WHEN 'no_binario' THEN 'non_binary'
      WHEN 'otro' THEN 'other'
      WHEN 'prefiero_no_decir' THEN 'prefer_not_to_say'
      ELSE genre
    END
    WHERE genre IN ('masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decir');
  `);

  await queryInterface.sequelize.query(`
    UPDATE ProjectSurveyAnswers
    SET genre = CASE genre
      WHEN 'masculino' THEN 'male'
      WHEN 'femenino' THEN 'female'
      WHEN 'no_binario' THEN 'non_binary'
      WHEN 'otro' THEN 'other'
      WHEN 'prefiero_no_decir' THEN 'prefer_not_to_say'
      ELSE genre
    END
    WHERE genre IN ('masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decir');
  `);
}
