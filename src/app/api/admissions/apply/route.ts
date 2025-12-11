import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/mail';

type ApplicationData = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  program_id: string;
  wasse_aggregate: string;
};

export async function POST(request: Request) {
  try {
    const data: ApplicationData = await request.json();
    
    // Validate required fields
    if (!data.first_name || !data.last_name || !data.email || !data.program_id || !data.wasse_aggregate) {
      return NextResponse.json(
        { success: false, message: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate WASSCE aggregate
    const wasseAggregate = Number.parseFloat(data.wasse_aggregate);
    if (Number.isNaN(wasseAggregate) || wasseAggregate < 6 || wasseAggregate > 48) {
      return NextResponse.json(
        { success: false, message: 'WASSCE aggregate must be between 6 and 48' },
        { status: 400 }
      );
    }

    // Check if an application with this email already exists
    const existingApplications = await query<{ id: number }>(
      'SELECT id FROM applications WHERE prospect_email = ? LIMIT 1',
      [data.email]
    );

    if (existingApplications.length > 0) {
      return NextResponse.json(
        { success: false, message: 'An application with this email already exists' },
        { status: 400 }
      );
    }

    // Generate a unique application key
    const applicationKey = Buffer.from(`${data.email}-${Date.now()}`).toString('base64url');

    // Insert the application into the database
    const result = await query<{ id: number }>(
      `INSERT INTO applications (
        prospect_email, 
        first_name, 
        last_name, 
        phone, 
        program_id, 
        wasse_aggregate, 
        application_key,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.email,
        data.first_name,
        data.last_name,
        data.phone || null,
        Number.parseInt(data.program_id, 10),
        wasseAggregate,
        applicationKey,
        'applied'
      ]
    );

    // Get the inserted application ID
    const applicationId = (result as any).insertId;

    // Send confirmation email
    try {
      await sendMail({
        to: data.email,
        subject: 'Application Received - VoltaTech University',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0d6efd;">Application Received</h2>
            <p>Dear ${data.first_name} ${data.last_name},</p>
            <p>Thank you for your application to VoltaTech University. We have received your application and it is currently under review.</p>
            <p><strong>Application Details:</strong></p>
            <ul>
              <li>Application ID: ${applicationId}</li>
              <li>Application Key: ${applicationKey}</li>
              <li>Status: Applied</li>
            </ul>
            <p>You can use your application key to track the status of your application.</p>
            <p>We will notify you via email once a decision has been made on your application.</p>
            <p>Best regards,<br>Admissions Team<br>VoltaTech University</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: applicationId,
      applicationKey: applicationKey,
    });

  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
