import nodemailer from 'nodemailer';
import { Twilio } from 'twilio';

// Types
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface NotificationConfig {
  email: EmailConfig;
  sms: SMSConfig;
}

// Default configuration (può essere sovrascritta tramite env vars)
const defaultConfig: NotificationConfig = {
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || ''
  }
};

// Email Service
export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config?: EmailConfig) {
    this.config = config || defaultConfig.email;
    
    if (!this.config.auth.user || !this.config.auth.pass) {
      console.warn('⚠️  Email credentials not configured. Email notifications disabled.');
      this.transporter = null as any;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail({
    to,
    subject,
    html,
    text
  }: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }) {
    if (!this.transporter) {
      console.log('📧 Email service not configured - would send:', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.auth.user,
        to,
        subject,
        html,
        text
      });

      console.log('📧 Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendCallReminder({
    employeeName,
    employeeEmail,
    callDate,
    callTime,
    managerName = 'Responsabile HR'
  }: {
    employeeName: string;
    employeeEmail: string;
    callDate: string;
    callTime: string;
    managerName?: string;
  }) {
    const subject = `📞 Promemoria: Call HR programmata per ${callDate}`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">📞 Call HR Programmata</h2>
          
          <p style="color: #4b5563; font-size: 16px; margin: 0 0 15px 0;">
            Ciao <strong>${employeeName}</strong>,
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
            Ti ricordiamo che hai una call programmata per il recap periodico:
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${callDate}</p>
            <p style="margin: 0 0 10px 0;"><strong>⏰ Orario:</strong> ${callTime}</p>
            <p style="margin: 0;"><strong>👤 Con:</strong> ${managerName}</p>
          </div>
          
          <p style="color: #4b5563; font-size: 14px; margin: 20px 0 0 0;">
            La call è un momento importante per discutere insieme del tuo percorso professionale, 
            degli obiettivi e di eventuali necessità di supporto.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Questo è un messaggio automatico del sistema HR Call Tracker.<br>
              Se hai domande, contatta il tuo responsabile HR.
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
Call HR Programmata

Ciao ${employeeName},

Ti ricordiamo che hai una call programmata per il recap periodico:

Data: ${callDate}
Orario: ${callTime}
Con: ${managerName}

La call è un momento importante per discutere insieme del tuo percorso professionale.
    `;

    return await this.sendEmail({
      to: employeeEmail,
      subject,
      html,
      text
    });
  }

  async sendOverdueNotification({
    employeeName,
    employeeEmail,
    daysOverdue,
    managerName = 'Responsabile HR'
  }: {
    employeeName: string;
    employeeEmail: string;
    daysOverdue: number;
    managerName?: string;
  }) {
    const subject = `⚠️ Call HR in ritardo - ${daysOverdue} giorni`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 10px; border-left: 4px solid #ef4444;">
          <h2 style="color: #dc2626; margin: 0 0 20px 0;">⚠️ Call HR in Ritardo</h2>
          
          <p style="color: #4b5563; font-size: 16px; margin: 0 0 15px 0;">
            Ciao <strong>${employeeName}</strong>,
          </p>
          
          <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">
            La tua call periodica HR è in ritardo di <strong style="color: #dc2626;">${daysOverdue} giorni</strong>.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0;">Ti chiediamo di contattare al più presto:</p>
            <p style="margin: 0;"><strong>👤 ${managerName}</strong></p>
          </div>
          
          <p style="color: #4b5563; font-size: 14px; margin: 20px 0 0 0;">
            È importante che ci aggiorniamo regolarmente per supportarti al meglio nel tuo percorso professionale.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Questo è un messaggio automatico del sistema HR Call Tracker.<br>
              Se hai domande, contatta il tuo responsabile HR.
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: employeeEmail,
      subject,
      html
    });
  }
}

// SMS Service
export class SMSService {
  private client: Twilio | null;
  private config: SMSConfig;

  constructor(config?: SMSConfig) {
    this.config = config || defaultConfig.sms;
    
    if (!this.config.accountSid || !this.config.authToken || 
        this.config.accountSid === '' || this.config.authToken === '') {
      console.warn('⚠️  SMS credentials not configured. SMS notifications disabled.');
      this.client = null;
      return;
    }

    try {
      this.client = new Twilio(this.config.accountSid, this.config.authToken);
    } catch (error) {
      console.warn('⚠️  SMS service initialization failed:', error.message);
      this.client = null;
    }
  }

  async sendSMS({
    to,
    message
  }: {
    to: string;
    message: string;
  }) {
    if (!this.client) {
      console.log('📱 SMS service not configured - would send:', { to, message });
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: to
      });

      console.log('📱 SMS sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendCallReminder({
    employeeName,
    employeePhone,
    callDate,
    callTime
  }: {
    employeeName: string;
    employeePhone: string;
    callDate: string;
    callTime: string;
  }) {
    const message = `📞 HR Call Reminder\n\nHi ${employeeName},\n\nYour HR call is scheduled for:\n${callDate} at ${callTime}\n\nPlease don't miss it!\n\n- HR Team`;
    
    return await this.sendSMS({
      to: employeePhone,
      message
    });
  }

  async sendUrgentReminder({
    employeeName,
    employeePhone,
    daysOverdue
  }: {
    employeeName: string;
    employeePhone: string;
    daysOverdue: number;
  }) {
    const message = `⚠️ URGENT: HR Call Overdue\n\nHi ${employeeName},\n\nYour HR call is ${daysOverdue} days overdue. Please contact your HR manager immediately.\n\n- HR Team`;
    
    return await this.sendSMS({
      to: employeePhone,
      message
    });
  }
}

// Unified Notification Service
export class NotificationService {
  private emailService: EmailService;
  private smsService: SMSService;

  constructor(config?: NotificationConfig) {
    this.emailService = new EmailService(config?.email);
    this.smsService = new SMSService(config?.sms);
  }

  async sendCallReminder({
    employeeName,
    employeeEmail,
    employeePhone,
    callDate,
    callTime,
    method = 'email'
  }: {
    employeeName: string;
    employeeEmail: string;
    employeePhone?: string;
    callDate: string;
    callTime: string;
    method?: 'email' | 'sms' | 'both';
  }) {
    const results: any[] = [];

    if (method === 'email' || method === 'both') {
      const emailResult = await this.emailService.sendCallReminder({
        employeeName,
        employeeEmail,
        callDate,
        callTime
      });
      results.push({ type: 'email', ...emailResult });
    }

    if ((method === 'sms' || method === 'both') && employeePhone) {
      const smsResult = await this.smsService.sendCallReminder({
        employeeName,
        employeePhone,
        callDate,
        callTime
      });
      results.push({ type: 'sms', ...smsResult });
    }

    return results;
  }

  async sendOverdueNotification({
    employeeName,
    employeeEmail,
    employeePhone,
    daysOverdue,
    method = 'email'
  }: {
    employeeName: string;
    employeeEmail: string;
    employeePhone?: string;
    daysOverdue: number;
    method?: 'email' | 'sms' | 'both';
  }) {
    const results: any[] = [];

    if (method === 'email' || method === 'both') {
      const emailResult = await this.emailService.sendOverdueNotification({
        employeeName,
        employeeEmail,
        daysOverdue
      });
      results.push({ type: 'email', ...emailResult });
    }

    if ((method === 'sms' || method === 'both') && employeePhone) {
      const smsResult = await this.smsService.sendUrgentReminder({
        employeeName,
        employeePhone,
        daysOverdue
      });
      results.push({ type: 'sms', ...smsResult });
    }

    return results;
  }
}

// Singleton instances
export const emailService = new EmailService();
export const smsService = new SMSService();
export const notificationService = new NotificationService();