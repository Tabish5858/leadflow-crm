/**
 * Fortune 500-grade email templates for LeadFlow CRM.
 *
 * Design principles:
 * - Table-based layout (Outlook-safe)
 * - Inline styles only (Gmail strips <style>)
 * - Bulletproof buttons (VML + table for Outlook)
 * - Dark mode support (data-ogsc/ogsb selectors where possible)
 * - Mobile-responsive (300px min-width, fluid scaling)
 * - Accessible (landmark roles, alt text, proper heading hierarchy)
 */

// ─── Shared Layout ───────────────────────────────────────────────────────────

interface BaseEmailOptions {
  previewText?: string;
}

function baseHtml(emailBody: string, opts?: BaseEmailOptions): string {
  const previewText = opts?.previewText || "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="https://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>LeadFlow CRM</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table { border-collapse: collapse; }
    td { font-family: 'Segoe UI', Tahoma, sans-serif; }
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style>
    /* Gmail-friendly dark mode overrides */
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr><td align="center">
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9; min-width:100%;">
    <tr>
      <td align="center" style="padding:24px 16px 40px 16px;">

        <!--[if mso]>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;"><tr><td>
        <![endif]-->

        <!-- ─── Inner Container ─── -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td style="padding-bottom:24px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="font-size:22px; font-weight:700; color:#1e293b; letter-spacing:-0.3px;">
                    LeadFlow CRM
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td style="background-color:#ffffff; border-radius:12px; padding:0; box-shadow:0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:12px; overflow:hidden;">
                <tr>
                  <td style="padding:40px 40px 32px 40px;">

                    ${emailBody}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="font-size:12px; line-height:18px; color:#94a3b8;">
                    <p style="margin:0 0 4px 0;">
                      Sent by <strong style="color:#64748b;">LeadFlow CRM</strong>
                    </p>
                    <p style="margin:0;">
                      You received this email because someone invited you to their workspace.
                    </p>
                    <p style="margin:8px 0 0 0;">
                      &copy; ${new Date().getFullYear()} LeadFlow CRM. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!--[if mso]>
        </td></tr></table>
        <![endif]-->

      </td>
    </tr>
  </table>
  <!--[if mso]>
    </td></tr></table>
  <![endif]-->
</body>
</html>`;
}

// ─── Bulletproof Button ─────────────────────────────────────────────────────

function buttonHtml(url: string, label: string): string {
  return `
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="6" stroke="f" fillcolor="#1e293b">
    <w:anchorlock/>
    <center style="color:#ffffff;font-family:'Segoe UI',Tahoma,sans-serif;font-size:14px;font-weight:600;">${label}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="border-radius:6px; background-color:#1e293b;">
        <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:12px 32px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:6px; background-color:#1e293b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; mso-hide:all;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
  <!--<![endif]-->
  `;
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function dividerHtml(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
    <tr>
      <td style="border-bottom:1px solid #e2e8f0; line-height:1px; font-size:1px;">&nbsp;</td>
    </tr>
  </table>`;
}

// ─── Template: Client Invitation ────────────────────────────────────────────

interface ClientInviteEmailOptions {
  inviterName: string;
  workspaceName: string;
  acceptUrl: string;
  message?: string;
}

export function renderClientInviteEmail(opts: ClientInviteEmailOptions): string {
  const { inviterName, workspaceName, acceptUrl, message } = opts;

  const body = `
    <!-- Heading -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px 0;">
      <tr>
        <td style="font-size:12px; font-weight:600; color:#64748b; letter-spacing:0.4px; text-transform:uppercase; padding-bottom:8px;">
          Client Portal Access
        </td>
      </tr>
      <tr>
        <td style="font-size:22px; font-weight:700; color:#0f172a; letter-spacing:-0.2px; line-height:1.35;">
          You've been invited to ${escapeHtml(workspaceName)}
        </td>
      </tr>
    </table>

    <!-- Body Text -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px 0;">
      <tr>
        <td style="font-size:16px; line-height:1.6; color:#475569;">
          <p style="margin:0 0 12px 0;">
            <strong style="color:#0f172a;">${escapeHtml(inviterName)}</strong> has invited you to access the client portal for <strong style="color:#0f172a;">${escapeHtml(workspaceName)}</strong>.
          </p>
          <p style="margin:0 0 12px 0;">
            Through this portal, you can track project progress, view shared files, and communicate with your service provider.
          </p>
          ${message ? `<p style="margin:0 0 12px 0; font-style:italic; color:#64748b;">"${escapeHtml(message)}"</p>` : ""}
          <p style="margin:0;">
            Click the button below to get started.
          </p>
        </td>
      </tr>
    </table>

    ${dividerHtml()}

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
      <tr>
        <td style="font-size:15px; font-weight:600; color:#0f172a; padding-bottom:16px;">
          Access your client portal
        </td>
      </tr>
      <tr>
        <td align="center">
          ${buttonHtml(acceptUrl, "Access Portal")}
        </td>
      </tr>
    </table>

    <!-- Expiry Notice -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0 0;">
      <tr>
        <td style="font-size:13px; line-height:1.5; color:#94a3b8;">
          <p style="margin:0;">
            This invitation expires in <strong style="color:#64748b;">7 days</strong>.
            If you do not yet have an account, you will be asked to create one when you accept.
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseHtml(body, {
    previewText: `Access the client portal for ${workspaceName}.`,
  });
}

// ─── Template: Workspace Invitation ──────────────────────────────────────────

interface InviteEmailOptions {
  inviterName: string;
  workspaceName: string;
  inviteRole: string;
  acceptUrl: string;
}

export function renderInviteEmail(opts: InviteEmailOptions): string {
  const { inviterName, workspaceName, inviteRole, acceptUrl } = opts;

  const body = `
    <!-- Heading -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px 0;">
      <tr>
        <td style="font-size:12px; font-weight:600; color:#64748b; letter-spacing:0.4px; text-transform:uppercase; padding-bottom:8px;">
          Workspace Access
        </td>
      </tr>
      <tr>
        <td style="font-size:22px; font-weight:700; color:#0f172a; letter-spacing:-0.2px; line-height:1.35;">
          Invitation to join ${escapeHtml(workspaceName)}
        </td>
      </tr>
    </table>

    <!-- Body Text -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px 0;">
      <tr>
        <td style="font-size:16px; line-height:1.6; color:#475569;">
          <p style="margin:0 0 12px 0;">
            <strong style="color:#0f172a;">${escapeHtml(inviterName)}</strong> has invited you to access the ${escapeHtml(workspaceName)} workspace in LeadFlow CRM.
          </p>
          <p style="margin:0;">
            Accept the invitation to proceed.
          </p>
        </td>
      </tr>
    </table>

    <!-- Role Badge -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="font-size:14px; color:#475569; padding:0;">
          Access level:
        </td>
        <td style="padding:0 0 0 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-radius:4px; border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:4px 12px; font-size:13px; font-weight:600; color:#0f172a; text-transform:capitalize;">
                ${escapeHtml(inviteRole)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${dividerHtml()}

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
      <tr>
        <td style="font-size:15px; font-weight:600; color:#0f172a; padding-bottom:16px;">
          Accept the invitation
        </td>
      </tr>
      <tr>
        <td align="center">
          ${buttonHtml(acceptUrl, "Accept invitation")}
        </td>
      </tr>
    </table>

    <!-- Expiry Notice -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0 0;">
      <tr>
        <td style="font-size:13px; line-height:1.5; color:#94a3b8;">
          <p style="margin:0;">
            This invitation expires in <strong style="color:#64748b;">7 days</strong>.
            If you do not yet have an account, you will be asked to create one when you accept.
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseHtml(body, {
    previewText: `Invitation to join ${workspaceName} from ${inviterName}.`,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
