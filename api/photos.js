// Pulls photos from an the unofficial Apple endpoint 
// https://www.icloud.com/sharedalbum/#B2a5oqs3q8cRZRw

const ALBUM_TOKEN = 'B2a5oqs3q8cRZRw';

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

async function fetchAlbumPhotos(token) {
  const stream = await icloudPost('sharedstreams.icloud.com', token, 'webstream', { streamCtag: null });
  const photos = stream.photos || [];

  const checksums = photos.map(p => {
    const sizes = Object.keys(p.derivatives).map(Number).sort((a, b) => b - a);
    return p.derivatives[sizes[0]].checksum;
  });

  const assets = await icloudPost('sharedstreams.icloud.com', token, 'webasseturls', { photoGuids: checksums });
  const items = assets.items || {};

  return photos
    .map(p => {
      const sizes = Object.keys(p.derivatives).map(Number).sort((a, b) => b - a);
      const checksum = p.derivatives[sizes[0]].checksum;
      const item = items[checksum];
      return item ? { src: `https://${item.url_location}${item.url_path}` } : null;
    })
    .filter(Boolean);
}