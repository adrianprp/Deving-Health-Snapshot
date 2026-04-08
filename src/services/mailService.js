'use strict'
import nodemailer from 'nodemailer';

export class Mailer {
    constructor() {
      this.transporter = nodemailer.createTransport({
        host: '',
        port: '',
        secure: false,
        tls: false,
        ignoreTLS: true,
        auth: false
      });
    }
  
    async sendMail(sender, to,cc, subject, html, attachments) {
      const mailOptions = {
        from: sender,
        to: to,
        cc: cc,
        subject: subject,
        html: html,
        attachments: attachments && [{
          filename: attachments[0]?.filename,
          path: attachments[0]?.path,
          cid: attachments[0]?.cid
        }, {
          filename: attachments[1]?.filename,
          path: attachments[1]?.path,
          cid: attachments[1]?.cid 
        }]
      };
  
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('Message sent:', info.messageId);
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }
}
