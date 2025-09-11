import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification-services';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      employeeName, 
      employeeEmail, 
      employeePhone,
      callDate,
      callTime,
      daysOverdue,
      method = 'email'
    } = body;

    // Validazione parametri base
    if (!type || !employeeName || !employeeEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: type, employeeName, employeeEmail' },
        { status: 400 }
      );
    }

    let results;

    switch (type) {
      case 'call_reminder':
        if (!callDate || !callTime) {
          return NextResponse.json(
            { error: 'Missing required fields for call reminder: callDate, callTime' },
            { status: 400 }
          );
        }

        results = await notificationService.sendCallReminder({
          employeeName,
          employeeEmail,
          employeePhone,
          callDate,
          callTime,
          method
        });
        break;

      case 'overdue_notification':
        if (daysOverdue === undefined) {
          return NextResponse.json(
            { error: 'Missing required field for overdue notification: daysOverdue' },
            { status: 400 }
          );
        }

        results = await notificationService.sendOverdueNotification({
          employeeName,
          employeeEmail,
          employeePhone,
          daysOverdue,
          method
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type. Use: call_reminder, overdue_notification' },
          { status: 400 }
        );
    }

    // Controlla se almeno una notifica è stata inviata con successo
    const hasSuccess = results.some(result => result.success);
    
    return NextResponse.json({
      success: hasSuccess,
      results,
      message: hasSuccess ? 'Notification sent successfully' : 'All notifications failed'
    }, { 
      status: hasSuccess ? 200 : 500 
    });

  } catch (error) {
    console.error('❌ Notification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Endpoint di test per verificare la configurazione
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const test = url.searchParams.get('test');

  if (test === 'config') {
    return NextResponse.json({
      email_configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      sms_configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      smtp_host: process.env.SMTP_HOST || 'not configured',
      twilio_configured: !!process.env.TWILIO_ACCOUNT_SID
    });
  }

  return NextResponse.json({
    endpoint: '/api/notifications/send',
    methods: ['POST'],
    description: 'Send email/SMS notifications for HR calls',
    example_body: {
      type: 'call_reminder', // or 'overdue_notification'
      employeeName: 'Mario Rossi',
      employeeEmail: 'mario.rossi@company.com',
      employeePhone: '+393331234567', // optional
      callDate: '15 Novembre 2024',
      callTime: '14:30',
      method: 'email' // 'email', 'sms', or 'both'
    }
  });
}