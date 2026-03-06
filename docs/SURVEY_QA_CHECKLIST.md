# Survey QA Checklist (Backend/API)

Checklist manual para validar endpoints del flujo de respuesta de encuestas.

## Preparación

- [ ] Base de datos con migraciones al día (incluida `00022-replace-demographics-with-age-on-projectSurveyAnswers.js`).
- [ ] Existe un proyecto publicado con una encuesta pública activa.
- [ ] La encuesta tiene al menos 1 pregunta obligatoria.

## Estructura y elegibilidad pública

- [ ] `GET /hub/projects/slug/:projectSlug/surveys/:surveyId` devuelve `200` con `survey.questions`.
- [ ] `GET /hub/projects/slug/:projectSlug/surveys/:surveyId/respondent-eligibility` sin token devuelve `mode: "anonymous"`.
- [ ] Con token de usuario con perfil completo devuelve `mode: "authenticated"` y `eligible: true`.
- [ ] Con token de usuario con perfil incompleto devuelve `422` en submit y/o `eligible: false` en endpoint de elegibilidad.
- [ ] Si usuario logueado ya respondió, elegibilidad devuelve `eligible: false` + `hasResponded: true` + `code: ALREADY_RESPONDED`.

## Submit logueado

- [ ] `POST /projects/:projectId/surveys/:surveyId/responses` con payload válido devuelve `201`.
- [ ] Segundo submit del mismo usuario en la misma encuesta devuelve `409` + `code: DUPLICATE_RESPONSE_USER`.

## Submit anónimo

- [ ] Submit anónimo válido devuelve `201`.
- [ ] Submit anónimo con `age < 14` devuelve `400` + `code: INVALID_RESPONDENT_DATA`.
- [ ] Submit anónimo sin `age` devuelve `400` + `code: INVALID_RESPONDENT_DATA`.

## Validación de respuestas

- [ ] Respuesta inválida por tipo (ej. rating fuera de rango) devuelve `400` + `code: INVALID_ANSWERS`.
- [ ] Respuesta faltante en pregunta obligatoria devuelve `400` + `code: INVALID_ANSWERS`.
- [ ] Clave de pregunta inexistente en `answers` devuelve `400` + `code: INVALID_ANSWERS`.

## Disponibilidad

- [ ] Survey cerrado o no visible devuelve `404` + `code: SURVEY_UNAVAILABLE`.
- [ ] Survey sin anónimos y submit sin token devuelve `401` + `code: AUTH_REQUIRED`.