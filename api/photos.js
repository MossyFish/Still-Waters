const ALBUM_TOKEN = 'B2a5oqs3q8cRZRw';

export default async function handler(req, res) {
  const debug = {};
  try {
    const stream = await icloudPost('sharedstreams.icloud.com', ALBUM_TOKEN, 'webstream', { streamCtag: null });
    const photos = stream.photos || [];
    debug.photoCount = photos.length;

    if (!photos.length) {
      return res.status(200).json({ debug, photos: [] });
    }

    debug.fullSamplePhoto = photos[0];

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ debug, photos: [] });
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