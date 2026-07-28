const ALBUM_TOKEN = 'B2a5oqs3q8cRZRw';

export default async function handler(req, res) {
  const debug = {};
  try {
    const stream = await icloudPost('sharedstreams.icloud.com', ALBUM_TOKEN, 'webstream', { streamCtag: null });
    const photos = stream.photos || [];
    debug.resolvedHost = resolvedHost;
    debug.photoCount = photos.length;

    if (!photos.length) {
      return res.status(200).json({ debug, photos: [] });
    }
        const checksums = photos.map(p => {
      const sizes = Object.keys(p.derivatives).map(Number).sort((a, b) => b - a);
      return p.derivatives[sizes[0]].checksum;
    });

    debug.checksumCount = checksums.length;
 
    const { data: assetsData } = await icloudRequest(resolvedHost, ALBUM_TOKEN, 'webasseturls', { photoGuids: checksums });
    debug.assetKeys = Object.keys(assetsData || {});
    const items = assetsData.items || {};
    debug.itemCount = Object.keys(items).length;
    debug.sampleItem = items[checksums[0]] || null;
 
    const result = photos.map(p => {
      const sizes = Object.keys(p.derivatives).map(Number).sort((a, b) => b - a);
      const checksum = p.derivatives[sizes[0]].checksum;
      const item = items[checksum];
      return item ? { src: `https://${item.url_location}${item.url_path}` } : null;
    }).filter(Boolean);
 
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
    return icloudRequest(data['X-Apple-MMe-Host'], token, path, body);
  }
  return { data, resolvedHost: host };
}