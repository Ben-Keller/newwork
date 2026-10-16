import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publishedContent} from './content-fingerprint.mjs';

test('detects published revisions and deletions without exposing content or credentials', async t => {
  let documents = [{_id: 'workPage', _rev: 'one', _updatedAt: '2026-10-16T00:00:00Z'}, {_id: 'work.one', _rev: 'two', _updatedAt: '2026-10-16T01:00:00Z'}];
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url.hostname, '7un4plyu.api.sanity.io');
    assert.equal(url.searchParams.get('perspective'), 'published');
    assert.match(url.searchParams.get('query'), /drafts/);
    return Response.json({result: documents});
  });
  const before = await publishedContent();
  assert.equal(before.contentUpdatedAt, '2026-10-16T01:00:00Z');
  assert.deepEqual(Object.keys(before).sort(), ['contentFingerprint', 'contentUpdatedAt']);
  assert.deepEqual(await publishedContent(), before);
  documents = [{...documents[0], _rev: 'edited'}, documents[1]];
  const edited = await publishedContent();
  assert.notEqual(edited.contentFingerprint, before.contentFingerprint);
  documents = [documents[0]];
  assert.notEqual((await publishedContent()).contentFingerprint, edited.contentFingerprint);
});

test('fails closed on unavailable or malformed CMS responses', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('', {status: 503}));
  await assert.rejects(publishedContent(), /HTTP 503/);
  mock.mock.mockImplementation(async () => Response.json({result: []}));
  await assert.rejects(publishedContent(), /Invalid published content/);
});
