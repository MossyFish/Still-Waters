const ALBUM_TOKEN = 'B2a5oqs3q8cRZRw';

export default async function handler(req, res) {
  const debug = {};
  try {
    debug.step = 'webstream';
    const stream = await icloudPost('sharedstreams.icloud.com', ALBUM_TOKEN, 'webstream', { streamCtag: null });
    debug.streamKeys = Object.keys(stream || {});
    debug.photoCount = (stream.photos || []).length;

    const photos = stream.photos || [];
    if (!photos.length) {
      debug.note = 'webstream call succeeded but returned zero photos — check the album token / that the album is public';
      return res.status(200).json({ debug, photos: [] });
    }

    debug.samplePhotoKeys = Object.keys(photos[0]);
    debug.sampleDerivativeSizes = Object.keys(photos[0].derivatives || {});

    const checksums = photos.map(p => {
      const sizes = Object.keys(p.derivatives).map(Number).sort((a, b) => b - a);
      return p.derivatives[sizes[0]].checksum;
    });
    debug.checksumCount = checksums.length;
    debug.sampleChecksum = checksums[0];

    debug.step = 'webasseturls';
    const assets = await icloudPost('sharedstreams.icloud.com', ALBUM_TOKEN, 'webasseturls', { photoGuids: checksums });
    debug.assetKeys = Object.keys(assets || {});
    const items = assets.items || {};
    debug.itemCount = Object.keys(items).length;
    debug.sampleItem = items[checksums[0]] || null;

    const result = photos
      .map(p => {
        const sizes = Object.keys(p.derivatives).map(Number).sort((a, b) => b - a);
        const checksum = p.derivatives[sizes[0]].checksum;
        const item = items[checksum];
        return item ? { src: `https://${item.url_location}${item.url_path}` } : null;
      })
      .filter(Boolean);

    debug.finalCount = result.length;
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ debug, photos: result });
  } catch (err) {
    debug.error = String(err);
    res.status(500).json({ debug, error: String(err) });
  }
}

async function icloudPost(host, token, path, body) {
  const r = await fetch(`https://${host}/${token}/sharedstreams/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (data['X-Apple-MMe-Host']) {
    return icloudPost(data['X-Apple-MMe-Host'], token, path, body);
  }
  return data;
}