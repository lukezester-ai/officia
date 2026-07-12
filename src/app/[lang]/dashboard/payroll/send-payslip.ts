'use server';

import { Resend } from 'resend';
import { requireTenant } from '@/lib/auth/get-tenant';

const resend = new Resend(process.env.RESEND_API_KEY);

// Bulgarian payroll rates
const EMPLOYER_RATE = 0.2132;

function fmt(n: number) {
  return n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generatePayslipHTML(emp: {
  firstName: string;
  lastName: string;
  position?: string;
  gross: number;
  doo: number;
  dzpo: number;
  zzo: number;
  tax: number;
  net: number;
}, month: string, companyName: string) {
  const totalDeductions = emp.doo + emp.dzpo + emp.zzo + emp.tax;
  const employerCost = emp.gross * (1 + EMPLOYER_RATE);

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Фиш за заплата — ${emp.firstName} ${emp.lastName}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:white;margin-bottom:12px;">O</div>
      <div style="font-size:28px;font-weight:900;color:white;letter-spacing:-0.5px;">Officia</div>
      <div style="color:rgba(255,255,255,0.7);font-size:14px;margin-top:4px;">Автоматизиран Фиш за Заплата</div>
    </div>

    <!-- Employee Info -->
    <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:16px;">
      <div style="font-size:20px;font-weight:700;color:white;">${emp.firstName} ${emp.lastName}</div>
      <div style="color:#94a3b8;font-size:14px;margin-top:2px;">${emp.position || 'Служител'} · ${companyName}</div>
      <div style="color:#6366f1;font-size:13px;margin-top:8px;font-weight:600;">Период: ${month}</div>
    </div>

    <!-- Main number -->
    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.05));border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:24px;margin-bottom:16px;text-align:center;">
      <div style="color:#6ee7b7;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Нетна заплата за превод</div>
      <div style="color:#34d399;font-size:42px;font-weight:900;letter-spacing:-1px;">${fmt(emp.net)} лв</div>
    </div>

    <!-- Breakdown -->
    <div style="background:#1e1e2e;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:16px;">
      <div style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:16px;font-weight:600;">Разбивка</div>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;color:#cbd5e1;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">Бруто заплата</td>
          <td style="padding:10px 0;text-align:right;color:#a78bfa;font-weight:700;font-size:15px;border-bottom:1px solid rgba(255,255,255,0.05);">${fmt(emp.gross)} лв</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">ДОО (10.52%)</td>
          <td style="padding:8px 0;text-align:right;color:#f87171;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">− ${fmt(emp.doo)} лв</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">ДЗПО (2.2%)</td>
          <td style="padding:8px 0;text-align:right;color:#f87171;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">− ${fmt(emp.dzpo)} лв</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">ЗЗО (3.2%)</td>
          <td style="padding:8px 0;text-align:right;color:#f87171;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">− ${fmt(emp.zzo)} лв</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05);">ДОД (10%)</td>
          <td style="padding:8px 0;text-align:right;color:#f87171;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05);">− ${fmt(emp.tax)} лв</td>
        </tr>
        <tr style="background:rgba(16,185,129,0.05);">
          <td style="padding:12px 0;color:white;font-weight:700;font-size:15px;">НЕТНА ЗАПЛАТА</td>
          <td style="padding:12px 0;text-align:right;color:#34d399;font-weight:900;font-size:18px;">${fmt(emp.net)} лв</td>
        </tr>
      </table>
    </div>

    <!-- Employer cost info -->
    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="font-size:12px;color:#818cf8;">
        💡 Общ разход на работодателя (с осигуровки): <strong style="color:#a5b4fc;">${fmt(employerCost)} лв/мес</strong>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#475569;font-size:12px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);">
      <div>Генерирано автоматично от <strong style="color:#6366f1;">Officia</strong> · officiabg.com</div>
      <div style="margin-top:4px;">Документът е информативен и не замества официален фиш по КТ.</div>
    </div>

  </div>
</body>
</html>`;
}

export async function sendPayslipEmail(
  employeeEmail: string,
  emp: {
    firstName: string;
    lastName: string;
    position?: string;
    gross: number;
    doo: number;
    dzpo: number;
    zzo: number;
    tax: number;
    net: number;
  }
) {
  try {
    const { tenantId } = await requireTenant();
    const now = new Date();
    const month = now.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });

    const html = generatePayslipHTML(emp, month, 'Officia Workspace');

    const result = await resend.emails.send({
      from: 'Officia <payslip@officiabg.com>',
      to: employeeEmail,
      subject: `Фиш за заплата — ${month} | ${emp.firstName} ${emp.lastName}`,
      html,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, emailId: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
