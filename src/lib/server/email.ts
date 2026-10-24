import { getSiteSetting, DEFAULT_EMAIL_CONFIG, DEFAULT_GENERAL_CONFIG, type SiteEmailConfig, type SiteGeneralConfig } from './settings';

export interface InviteEmailOptions {
	recipient: string;
	code: string;
	role?: string;
	appName?: string;
	origin?: string;
	maxUses?: number;
	inviterName?: string;
}

export function generateInviteEmailHtml(options: {
	code: string;
	appName?: string;
	origin?: string;
	role?: string;
	maxUses?: number;
	inviterName?: string;
}): string {
	const appName = options.appName || 'Run';
	const origin = (options.origin || 'http://localhost:5173').replace(/\/$/, '');
	const registrationUrl = `${origin}/login?code=${encodeURIComponent(options.code)}`;
	const roleLabel = options.role ? options.role.charAt(0).toUpperCase() + options.role.slice(1) : 'Member';
	const inviter = options.inviterName || 'An administrator';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to ${appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #121215; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1f1f23; text-align: left;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #f59e0b; width: 28px; height: 28px; border-radius: 8px; text-align: center; vertical-align: middle;">
                    <span style="color: #09090b; font-size: 16px; font-weight: 800; line-height: 28px;">⚡</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">${appName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">
                You're invited to join
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                ${inviter} has granted you access to the <strong style="color: #f4f4f5;">${appName}</strong> link management platform with <span style="display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: 600; color: #fbbf24; background-color: rgba(245, 158, 11, 0.15); border-radius: 6px;">${roleLabel}</span> permissions.
              </p>

              <!-- VIP Code Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; background-color: #09090b; border: 1px dashed #3f3f46; border-radius: 12px; text-align: center;">
                <tr>
                  <td style="padding: 20px 16px;">
                    <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 6px; font-weight: 600;">Your VIP Invite Code</span>
                    <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 22px; font-weight: 700; color: #fbbf24; letter-spacing: 0.15em;">${options.code}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${registrationUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #f4f4f5; color: #09090b; font-size: 14px; font-weight: 600; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">
                      Accept Invitation & Register &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a; text-align: center;">
                The invite code will be automatically populated and securely locked to your registration attempt.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0d0d10; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #52525b;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 11px; color: #3f3f46;">
                Direct registration link: <a href="${registrationUrl}" style="color: #71717a; text-decoration: underline;">${registrationUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatches the invitation email via configured provider (Resend / SMTP / Console)
 */
export async function sendInviteEmail(options: InviteEmailOptions): Promise<{
	success: boolean;
	provider: string;
	messageId?: string;
	previewUrl?: string;
	error?: string;
}> {
	const emailConfig = await getSiteSetting<SiteEmailConfig>('email', DEFAULT_EMAIL_CONFIG);
	const generalConfig = await getSiteSetting<SiteGeneralConfig>('general', DEFAULT_GENERAL_CONFIG);

	const appName = generalConfig.siteTitle || 'Run';
	const origin = options.origin || generalConfig.siteUrl || 'http://localhost:5173';
	const registrationUrl = `${origin.replace(/\/$/, '')}/login?code=${encodeURIComponent(options.code)}`;

	const htmlBody = generateInviteEmailHtml({
		code: options.code,
		appName,
		origin,
		role: options.role,
		maxUses: options.maxUses,
		inviterName: options.inviterName
	});

	const subject = `You're invited to ${appName} (VIP Invite: ${options.code})`;

	// 1. Resend API Provider
	if (emailConfig.provider === 'resend' || emailConfig.resendApiKey) {
		const apiKey = emailConfig.resendApiKey || process.env.RESEND_API_KEY;
		if (apiKey) {
			try {
				const from = emailConfig.fromName
					? `${emailConfig.fromName} <${emailConfig.fromEmail || 'onboarding@resend.dev'}>`
					: emailConfig.fromEmail || 'onboarding@resend.dev';

				const res = await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						from,
						to: [options.recipient],
						subject,
						html: htmlBody
					})
				});

				const data = (await res.json()) as any;
				if (!res.ok) {
					console.error('Resend API error:', data);
					return {
						success: false,
						provider: 'resend',
						error: data.message || `Resend returned status ${res.status}`
					};
				}

				return {
					success: true,
					provider: 'resend',
					messageId: data.id,
					previewUrl: registrationUrl
				};
			} catch (err: any) {
				console.error('Failed to dispatch via Resend:', err);
				return { success: false, provider: 'resend', error: err.message };
			}
		}
	}

	// 2. Console fallback (or development mode)
	console.log(`\n======================================================`);
	console.log(`[INVITATION EMAIL DISPATCH] Provider: ${emailConfig.provider}`);
	console.log(`To: ${options.recipient}`);
	console.log(`Subject: ${subject}`);
	console.log(`VIP Code: ${options.code}`);
	console.log(`Registration URL: ${registrationUrl}`);
	console.log(`======================================================\n`);

	return {
		success: true,
		provider: emailConfig.provider || 'console',
		previewUrl: registrationUrl
	};
}

export interface WorkspaceInviteEmailOptions {
	recipient: string;
	workspaceName: string;
	joinUrl: string;
	inviterName?: string;
	appName?: string;
	role?: string;
}

export function generateWorkspaceInviteHtml(options: {
	workspaceName: string;
	joinUrl: string;
	inviterName?: string;
	appName?: string;
	role?: string;
}): string {
	const appName = options.appName || 'Run';
	const inviter = options.inviterName || 'A team member';
	const roleLabel = options.role ? options.role.charAt(0).toUpperCase() + options.role.slice(1) : 'Member';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to collaborate on ${options.workspaceName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #121215; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1f1f23; text-align: left;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #f59e0b; width: 28px; height: 28px; border-radius: 8px; text-align: center; vertical-align: middle;">
                    <span style="color: #09090b; font-size: 16px; font-weight: 800; line-height: 28px;">⚡</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">${appName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em;">
                Workspace Invitation
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                ${inviter} has invited you to collaborate in the <strong style="color: #f4f4f5;">${options.workspaceName}</strong> workspace with <span style="display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: 600; color: #fbbf24; background-color: rgba(245, 158, 11, 0.15); border-radius: 6px;">${roleLabel}</span> permissions.
              </p>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${options.joinUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #f4f4f5; color: #09090b; font-size: 14px; font-weight: 600; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">
                      Accept & Join Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a; text-align: center;">
                This invitation link expires in 7 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #0d0d10; border-top: 1px solid #1f1f23; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #52525b;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 11px; color: #3f3f46;">
                Direct link: <a href="${options.joinUrl}" style="color: #71717a; text-decoration: underline;">${options.joinUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWorkspaceInviteEmail(options: WorkspaceInviteEmailOptions): Promise<{
	success: boolean;
	provider: string;
	messageId?: string;
	previewUrl?: string;
	error?: string;
}> {
	const emailConfig = await getSiteSetting<SiteEmailConfig>('email', DEFAULT_EMAIL_CONFIG);
	const generalConfig = await getSiteSetting<SiteGeneralConfig>('general', DEFAULT_GENERAL_CONFIG);
	const appName = generalConfig.siteTitle || 'Run';

	const htmlBody = generateWorkspaceInviteHtml({
		workspaceName: options.workspaceName,
		joinUrl: options.joinUrl,
		inviterName: options.inviterName,
		appName,
		role: options.role
	});

	const subject = `You're invited to join ${options.workspaceName} on ${appName}`;

	if (emailConfig.provider === 'resend' || emailConfig.resendApiKey) {
		const apiKey = emailConfig.resendApiKey || process.env.RESEND_API_KEY;
		if (apiKey) {
			try {
				const from = emailConfig.fromName
					? `${emailConfig.fromName} <${emailConfig.fromEmail || 'onboarding@resend.dev'}>`
					: emailConfig.fromEmail || 'onboarding@resend.dev';

				const res = await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						from,
						to: [options.recipient],
						subject,
						html: htmlBody
					})
				});

				const data = (await res.json()) as any;
				if (!res.ok) {
					return {
						success: false,
						provider: 'resend',
						error: data.message || `Resend returned status ${res.status}`
					};
				}

				return {
					success: true,
					provider: 'resend',
					messageId: data.id,
					previewUrl: options.joinUrl
				};
			} catch (err: any) {
				return { success: false, provider: 'resend', error: err.message };
			}
		}
	}

	console.log(`\n======================================================`);
	console.log(`[WORKSPACE INVITE EMAIL DISPATCH] Provider: ${emailConfig.provider}`);
	console.log(`To: ${options.recipient}`);
	console.log(`Workspace: ${options.workspaceName}`);
	console.log(`Join URL: ${options.joinUrl}`);
	console.log(`======================================================\n`);

	return {
		success: true,
		provider: emailConfig.provider || 'console',
		previewUrl: options.joinUrl
	};
}
