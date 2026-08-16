import { OTP_CODE_TTL_MINUTES } from "./otpCodes.js";

const FONT = "font-family:Arial,Helvetica,sans-serif;";

export type CodeEmailContent = {
  code: string;
  previewText: string;
  title: string;
  subtitle: string;
  footerNote: string;
};

/**
 * Table-based dark-branded HTML shell shared by all OTP emails. Email-client
 * safe: inline styles only, 600px max width, real-text OTP, CID images with
 * alt text so the message stays fully readable when images are blocked.
 */
export function buildCodeEmailHtml(content: CodeEmailContent): string {
  return `<div style="display:none;max-height:0px;overflow:hidden;mso-hide:all;">${content.previewText}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#151238" style="background-color:#151238;">
  <tr>
    <td align="center" style="padding:32px 16px 40px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr><td><img src="cid:platyko-banner" width="600" alt="Platyko &mdash; Learn JavaScript by playing" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:20px 20px 0 0;" /></td></tr>
        <tr>
          <td bgcolor="#1E1B4B" style="background-color:#1E1B4B;border-radius:0 0 20px 20px;padding:40px 32px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" style="padding-bottom:24px;"><img src="cid:platyko-icon" width="56" height="56" alt="Platyko app icon" style="display:block;border:0;border-radius:14px;" /></td></tr>
              <tr><td align="center" style="${FONT}font-size:26px;line-height:34px;font-weight:bold;color:#FFFFFF;padding-bottom:12px;">${content.title}</td></tr>
              <tr><td align="center" style="${FONT}font-size:15px;line-height:23px;color:#A5B4D4;padding-bottom:28px;">${content.subtitle}</td></tr>
              <tr>
                <td align="center" style="padding-bottom:16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr><td align="center" bgcolor="#151238" style="background-color:#151238;border:1px solid #33306B;border-radius:14px;padding:20px 32px;font-family:'Courier New',Courier,monospace;font-size:36px;line-height:44px;font-weight:bold;letter-spacing:8px;color:#F5C518;">${content.code}</td></tr>
                  </table>
                </td>
              </tr>
              <tr><td align="center" style="${FONT}font-size:13px;line-height:20px;color:#6B7BA8;padding-bottom:28px;">This code expires in ${OTP_CODE_TTL_MINUTES} minutes.</td></tr>
              <tr><td align="center" style="${FONT}font-size:13px;line-height:20px;color:#6B7BA8;border-top:1px solid #2A2757;padding-top:24px;">${content.footerNote}</td></tr>
            </table>
          </td>
        </tr>
        <tr><td align="center" style="padding:32px 0 10px;"><img src="cid:platyko-mascot" width="96" height="96" alt="Platy, the Platyko mascot" style="display:block;border:0;border-radius:48px;" /></td></tr>
        <tr><td align="center" style="${FONT}font-size:14px;line-height:22px;color:#A5B4D4;padding-bottom:6px;">Happy coding &mdash; see you in the app!</td></tr>
        <tr><td align="center" style="${FONT}font-size:12px;line-height:18px;color:#6B7BA8;">Platyko &middot; Learn JavaScript by playing</td></tr>
      </table>
    </td>
  </tr>
</table>`;
}
