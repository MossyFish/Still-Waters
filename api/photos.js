const ALBUM_TOKEN = '05epiLMCAzsSALPEU6Tyz9csw';

export default async function handler(req, res) {
  try {
    const photos = await fetchAlbumPhotos(ALBUM_TOKEN);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(photos);
  } catch (err) {
    console.error('iCloud album fetch failed:', err);
    res.status(500).json({ error: 'Failed to load iCloud album', detail: String(err) });
  }
}

async function icloudRequest(host, token, path, body) {
  const r = await fetch(`https://${host}/${token}/sharedstreams/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (data['X-Apple-MMe-Host']) {
    return icloudRequest(data['X-Apple-MMe-Host'], token, path, body);
  }
  return { data, resolvedHost: host };
}

async function fetchAlbumPhotos(token) {
  const { data: stream, resolvedHost } = await icloudRequest('sharedstreams.icloud.com', token, 'webstream', { streamCtag: null });
  const photos = stream.photos || [];
  if (!photos.length) return [];

  const photoGuids = photos.map(p => p.photoGuid);

  const { data: assetsData } = await icloudRequest(resolvedHost, token, 'webasseturls', { photoGuids });
  const items = assetsData.items || {};

  return photos
    .map(p => {
      const sizes = Object.keys(p.derivatives).map(Number).sort((a, b) => b - a);
      const checksum = p.derivatives[sizes[0]].checksum;
      const item = items[checksum];
      return item ? { src: `https://${item.url_location}${item.url_path}` } : null;
    })
    .filter(Boolean);
}