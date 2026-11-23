/**
 * Validadores de seguridad y formatos para UniShare
 */

/**
 * Valida de forma estricta los requisitos de seguridad de una contraseña:
 * - Longitud mínima de 6 caracteres.
 * - Debe contener al menos una letra y un número (o carácter especial).
 * @param {string} password
 * @returns {{isValid: boolean, message: string}}
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    return {
      isValid: false,
      message: 'Por favor ingresa una contraseña.'
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      message: 'La contraseña debe tener al menos 6 caracteres.'
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasLetter || !hasNumberOrSpecial) {
    return {
      isValid: false,
      message: 'La contraseña debe tener al menos 6 caracteres e incluir letras y números.'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Valida estrictamente que el correo pertenezca al dominio @gmail.com
 * @param {string} email
 * @returns {boolean}
 */
export const isValidGmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return clean.endsWith('@gmail.com') && clean.length > '@gmail.com'.length;
};

export default {
  validatePassword,
  isValidGmail
};
