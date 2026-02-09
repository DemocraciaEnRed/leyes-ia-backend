import mailer from '../services/mailer.js';

// const agenda = require('../services/agenda');
/**
 * Send a verification email to the user
 * @param {Object} user - the user object
 * @param {String} token - the token to send to the email user
 */
export const sendSignupEmail = async (user, url) => {
  try {
    // render the email html
    const html = await mailer.renderEmailHtml('signup', {
      url: url
    })
    // send the email
    await mailer.sendNow(user.email, "Confirmá tu registro", html)
    return;
  } catch (error) {
    throw error;
  }
}

/**
 * Send a verification email to the user
 * @param {Object} user - the user object
 * @param {String} token - the token to send to the email user
 */
export const sendVerificationEmail = async (user, url) => {
  try {
    // render the email html
    const html = await mailer.renderEmailHtml('signup', {
      url: url
    })
    // send the email
    await mailer.sendNow(user.email, "Confirmá tu registro", html)
    return;
  } catch (error) {
    throw error;
  }
}

/**
 * Send a password reset email to the user
 * @param {*} user 
 * @param {*} url 
 * @returns 
 */
export const sendPasswordResetEmail = async (user, url) => {
  try {
    // render the email html
    const html = await mailer.renderEmailHtml('reset', {
      url: url
    })
    // send the email
    await mailer.sendNow(user.email, "Restablecer tu contraseña", html)
    return;
  } catch (error) {
    throw error;
  }
}

/**
 * Get the html for the account verification email
 * @param {*} user 
 * @returns 
 */
export const getSuccessAccountVerificationHtml = async (user) => {
  try {
    return await mailer.renderHtml('auth/successVerification', {
      appUrl: process.env.APP_URL
    })
  } catch (error) {
    throw error;
  }
}

/**
 * Get the html for the password reset email
 * @param {*} user
 * @returns 
 */
export const getAlreadyVerifiedHtml = async (user) => {
  try {
    return await mailer.renderHtml('auth/alreadyVerified', {
      appUrl: process.env.APP_URL
    })
  } catch (error) {
    throw error;
  }
}


export const getNoTokenHtml = async (user) => {
  try {
    return await mailer.renderHtml('auth/noToken', {
      appUrl: process.env.APP_URL
    })
  } catch (error) {
    throw error;
  }
}

export const getExpiredTokenHtml = async (user) => {
  try {
    return await mailer.renderHtml('auth/expiredToken', {
      appUrl: process.env.APP_URL
    })
  } catch (error) {
    throw error;
  }
}

export const getNoUserHtml = async (user) => {
  try {
    return await mailer.renderHtml('auth/noUser', {
      appUrl: process.env.APP_URL
    })
  } catch (error) {
    throw error;
  }
}

export const getGenericErrorHtml = async (user) => {
  try {
    return await mailer.renderHtml('auth/error', {
      appUrl: process.env.APP_URL
    })
  } catch (error) {
    throw error;
  }
}