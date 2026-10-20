import { isRecord, isSafeEmail } from '../../shared/content-policy';

export function isContactInboxReady(email: string | undefined): email is string {
  if (!isSafeEmail(email)) return false;
  const domain = email.split('@')[1]!.toLowerCase();
  return !/(?:^|\.)(?:lorem\.ipsum|example\.(?:com|net|org)|example|invalid|test|localhost)$/u.test(domain);
}

type Enquiry = { name: string; email: string; message: string };

export function buildEnquiryBody({ name, email, message }: Enquiry): string {
  return `${message}\r\n\r\nName: ${name}\r\nEmail: ${email}`;
}

export function buildEnquiryMailto(recipient: string | undefined, enquiry: Enquiry): string | undefined {
  if (!isContactInboxReady(recipient)) return undefined;
  return `mailto:${encodeURIComponent(recipient).replace('%40', '@')}?subject=${encodeURIComponent('Project enquiry — New Work Agency')}&body=${encodeURIComponent(buildEnquiryBody(enquiry))}`;
}

type SubmissionResult =
  | { kind: 'success' }
  | { kind: 'error'; message: string; fields: Partial<Record<keyof Enquiry, string>>; verification: boolean };

/** Formspree's documented JSON success has `next`; never follow that URL from AJAX. */
export function parseEnquiryResponse(status: number, payload: unknown): SubmissionResult {
  const errors = isRecord(payload) && Array.isArray(payload.errors) ? payload.errors.filter(isRecord) : [];
  const hasError = isRecord(payload) && (Boolean(payload.error) || errors.length > 0);
  if (status >= 200 && status < 300 && isRecord(payload) && !hasError &&
    (payload.ok === true || typeof payload.next === 'string')) return { kind: 'success' };

  const fields: Partial<Record<keyof Enquiry, string>> = {};
  for (const error of errors) {
    if (error.field === 'name' || error.field === 'email' || error.field === 'message') {
      fields[error.field] = typeof error.message === 'string' ? error.message.slice(0, 200) : 'Please check this field.';
    }
  }
  const verification = errors.some(error => /captcha/iu.test(String(error.code || '') + String(error.message || ''))) ||
    (isRecord(payload) && /captcha/iu.test(String(payload.error || '')));
  const message = verification
    ? 'One more step: complete the spam check on Formspree to send your enquiry.'
    : status === 429
      ? 'Sending is temporarily busy. Please wait a little before trying again, or use email.'
      : Object.keys(fields).length
        ? 'Please check the highlighted details and try again.'
        : 'We couldn’t send your enquiry. Your details are still here; please try again or use email.';
  return { kind: 'error', message, fields, verification };
}
