import { describe, expect, it } from 'vitest';
import { buildEnquiryBody, buildEnquiryMailto, isContactInboxReady, parseEnquiryResponse } from '../../src/lib/contact-enquiry';
import { safeFormspreeEndpoint } from '../../shared/content-policy';
import { safeFormspreeEndpoint as studioEndpoint } from '../../../studio-new-work/shared/content-policy';

describe('contact enquiry handoff', () => {
  it('keeps placeholder and missing inboxes out of outgoing drafts', () => {
    for (const email of [undefined, '', 'hello@lorem.ipsum', 'hello@example.com', 'hello@studio.invalid', 'hello@studio.example', 'bad\n@agency.com']) {
      expect(isContactInboxReady(email)).toBe(false);
      expect(buildEnquiryMailto(email, { name: 'A', email: 'a@studio.com', message: 'Hello' })).toBeUndefined();
    }
    expect(isContactInboxReady('enquiries@newworkagency.com')).toBe(true);
  });

  it('encodes the brief and reply details without allowing extra mail headers', () => {
    const enquiry = {
      name: 'Zoë & Co',
      email: 'zoe+film@studio.com',
      message: 'A film about A&B?\nBudget: €20,000.\n&bcc=someone@else.com',
    };
    const href = buildEnquiryMailto('film+photo@newworkagency.com', enquiry)!;
    const url = new URL(href);
    expect(decodeURIComponent(url.pathname)).toBe('film+photo@newworkagency.com');
    expect([...url.searchParams.keys()]).toEqual(['subject', 'body']);
    expect(url.searchParams.get('body')).toBe(buildEnquiryBody(enquiry));
    expect(url.searchParams.get('subject')).toBe('Project enquiry — New Work Agency');
  });
});

describe('Formspree submission boundary', () => {
  it('accepts only public form endpoints in both the CMS and website', () => {
    const accepted = 'https://formspree.io/f/abcdefgh';
    for (const validate of [safeFormspreeEndpoint, studioEndpoint]) {
      expect(validate(` ${accepted} `)).toBe(accepted);
      for (const value of [undefined, {}, '', 'javascript:alert(1)', 'http://formspree.io/f/abcdefgh',
        'https://formspree.io.evil.test/f/abcdefgh', `${accepted}?redirect=https://elsewhere.test`,
        `${accepted}#hash`, 'https://formspree.io@elsewhere.test/f/abcdefgh', `${accepted}/extra`,
        'https://formspree.io/f/a%2Fb', 'https://formspree.io:444/f/abcdefgh']) {
        expect(validate(value)).toBeUndefined();
      }
    }
  });

  it('requires an accepted JSON response and never treats error responses as success', () => {
    expect(parseEnquiryResponse(200, { next: 'https://formspree.io/thanks' })).toEqual({ kind: 'success' });
    expect(parseEnquiryResponse(200, { ok: true })).toEqual({ kind: 'success' });
    for (const [status, payload] of [[200, {}], [200, null], [200, '<html>challenge</html>'],
      [500, { ok: true }], [200, { next: '/thanks', error: 'Inactive form' }]] as const) {
      expect(parseEnquiryResponse(status, payload).kind).toBe('error');
    }
    expect(parseEnquiryResponse(422, { errors: [{ field: 'email', code: 'TYPE_EMAIL', message: 'Check your email.' }] }))
      .toMatchObject({ kind: 'error', fields: { email: 'Check your email.' } });
    expect(parseEnquiryResponse(429, {})).toMatchObject({ kind: 'error', message: expect.stringContaining('wait') });
    expect(parseEnquiryResponse(400, { error: 'reCAPTCHA validation failed' })).toMatchObject({ kind: 'error', verification: true });
  });
});
