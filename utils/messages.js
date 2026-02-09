export default {
	error: {
		default: "Ocurrió un error inesperado."
	},
	auth: {
		error: {
			invalidCredentials: "El email o contraseña son incorrectos",
			unverified: "La cuenta aún no ha ha sido verificada",
			alreadyLoggedIn: "Acceso no autorizado - Ya ha iniciado sesión",
			unauthorized: "Acceso no autorizado",
			noToken: "Acceso no autorizado - No se encontró token",
			forbidden: "Acceso no autorizado - No cuenta con permiso para acceder a este recurso",
			alreadyVerified: "La cuenta ya ha sido verificada",
			tokenNotFound: "El token no fue encontrado o pudo haber expirado. Por favor, solicite un nuevo token",
			userNotFound: "Usuario no encontrado",
			emailNotFound: "El email no fue encontrado o es incorrecto",
			emailNotAssociated: "La direccion de email {{email}} no se encuentra asociada a ninguna cuenta. Por favor, verifique que la dirección sea correcta"
		},
		success: {
			login: "Sesión iniciada correctamente",
			logout: "Sesión cerrada correctamente",
			signup: "Cuenta creada correctamente",
			passwordUpdated: "Contraseña actualizada correctamente",
			verification: "Cuenta verificada correctamente. Por favor, inicie sesión",
			verificationMailSent: "Un email de verificación ha sido enviado a su dirección de correo {{email}}",
			verificationMailResent: "Un nuevo email de verificación ha sido enviado a su dirección de correo {{email}}",
			resetMailSent: "Un email con instrucciones para restablecer su contraseña ha sido enviado a su dirección de correo {{email}}"
		}
	},
	validationError: {
		invalidValue: "Valor inválido",
		defaultMessage: "Hubo un error validando los datos",
		email: "El email no es válido",
		password: "La contraseña no es valida (debe tener al menos 6 caracteres)",
		firstName: "El nombre no es valido",
		lastName: "El nombre no es valido",
		date: "La fecha no es válida, debe ser ISO 8601, o sea, YYYY-MM-DD",
		role: "El rol no es válido",
		integer: "El valor debe ser un número entero",
		boolean: "El valor debe ser true o false",
		string: "El valor debe ser una cadena de caracteres",
		page: "Debe ser un numero entero mayor o igual a 1",
		limit: "Debe ser un numero entero entre 1 y 25",
		token: "El token es requerido o no es valido",
		query: "El parametro query debe ser un string",
	}
};