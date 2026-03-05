# Survey Runtime Contract (Public + Submit)

Este documento describe el contrato vigente para responder encuestas desde el flujo ciudadano (anónimo o logueado).

## Endpoints públicos (Hub)

Base: `/hub/projects`

- `GET /slug/:projectSlug/surveys/:surveyId`
  - Devuelve estructura de encuesta pública utilizable por frontend.
  - Incluye: metadatos, `allowAnonymousResponses`, `questions`, campos requeridos de encuestado.

- `GET /slug/:projectSlug/surveys/:surveyId/respondent-eligibility`
  - `authenticate` opcional.
  - Devuelve estado de elegibilidad para:
    - `mode: "authenticated"` si hay sesión.
    - `mode: "anonymous"` si no hay sesión.
  - Incluye `eligible`, `requiredFields`, `missingFields`, `allowAnonymousResponses`.
  - Para usuario logueado que ya respondió puede devolver:
    - `eligible: false`
    - `hasResponded: true`
    - `code: "ALREADY_RESPONDED"`

## Endpoint de envío de respuestas

Base: `/projects/:projectId/surveys`

- `POST /:surveyId/responses`
  - Soporta envío logueado o anónimo.
  - Requiere `answers` (objeto).
  - Para anónimo requiere además:
    - `dateOfBirth` (`YYYY-MM-DD`)
    - `genre` (enum español)
    - `provinceId` (válido)
    - `documentNumber` (solo dígitos)

## Reglas de negocio vigentes

1. La encuesta debe estar disponible públicamente (`public`, `visible`, no cerrada).
2. Usuario logueado:
   - Debe tener perfil de encuesta completo (`dateOfBirth`, `genre`, `provinceId`, `documentNumber`).
   - Se bloquea más de una respuesta por encuesta y usuario (`projectSurveyId + userId`).
  - El endpoint de elegibilidad refleja este bloqueo antes de comenzar (`ALREADY_RESPONDED`).
3. Usuario anónimo:
   - Solo permitido si `allowAnonymousResponses = true`.
   - Se bloquea más de una respuesta por encuesta + DNI (`projectSurveyId + documentNumber`, con `userId = null`).
4. `answers` se valida contra el schema de preguntas de la encuesta:
   - `single-choice`: opción válida.
   - `multiple-choice`: arreglo de opciones válidas.
   - `rating`: entero en rango `1..scale` (default 5).
   - `open-ended`: texto no vacío.
   - Respeta `required` y rechaza claves de preguntas inexistentes.

## Persistencia relevante

Tabla: `ProjectSurveyAnswers`

Campos demográficos persistidos:
- `dateOfBirth`
- `genre`
- `provinceId`
- `documentNumber` (columna dedicada)

Además se mantiene `respondentData` para metadatos complementarios.

## Códigos de error de submit

`POST /projects/:projectId/surveys/:surveyId/responses` puede devolver:

- `SURVEY_UNAVAILABLE` (404): encuesta no encontrada/no disponible públicamente.
- `AUTH_REQUIRED` (401): requiere login para esta encuesta.
- `PROFILE_INCOMPLETE` (422): faltan datos de perfil en usuario logueado.
- `INVALID_RESPONDENT_DATA` (400): datos demográficos inválidos.
- `INVALID_ANSWERS` (400): respuestas inválidas/incompletas respecto al schema.
- `DUPLICATE_RESPONSE_USER` (409): usuario logueado ya respondió.
- `DUPLICATE_RESPONSE_DOCUMENT` (409): ya existe respuesta anónima con ese DNI.

## Privacidad / alcance de uso de DNI

En flujo anónimo, `documentNumber` se usa principalmente para deduplicación de respuestas por encuesta.

A nivel UX se comunica que el dato se recolecta internamente y no se comparte con el legislador.

## Nota de evolución

Se deja abierta la posibilidad de vincular respuestas anónimas previas si luego el ciudadano crea una cuenta, sujeto a definición de producto y política de privacidad.