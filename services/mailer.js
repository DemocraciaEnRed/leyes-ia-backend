// const agenda = require("agenda");
import nunjucks from 'nunjucks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

nunjucks.configure(path.join(__dirname, 'templates'), {
  autoescape: true,
  noCache: true,
});

const transporter = nodemailer.createTransport({
  host: process.env.MAILER_HOST,
  port: process.env.MAILER_PORT,
  auth: {
    user: process.env.MAILER_USER,
    pass: process.env.MAILER_PASSWORD
  }
});


export const renderEmailHtml = async (template, data) => {
  try {
    // Render the nunjucks template
    return nunjucks.render(`mails/${template}.njk`, data);
  } catch (error) {
    throw error;
  }
}

export const renderHtml = async (templatePath, data) => {
  try {
    // Render the nunjucks template
    return nunjucks.render(`${templatePath}.njk`, data);
  } catch (error) {
    throw error;
  }
}



export const sendNow = async (to, subject, html) => {
  try {
    let info = await transporter.sendMail({
      from: process.env.MAILER_FROM,
      to,
      subject,
      html
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.log(error);
  }
}

export const sendLater = async (to, subject, html, when) => {
  try {
    // let info = await agenda.schedule(when, 'send email', {
    //   to,
    //   subject,
    //   html
    // });
    // console.log('Job created: %s', info.attrs._id);
  } catch (error) {
    console.log(error);
  }
}

export default {
  renderEmailHtml,
  renderHtml,
  sendNow,
  sendLater,
};
