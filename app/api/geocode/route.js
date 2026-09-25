export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

    let url = `https://us1.locationiq.com/v1/search?key=${process.env.LOCATIONIQ_TOKEN}&format=json&limit=1&q=${encodeURIComponent(q)}`;
    if (lat && lng) {
      const delta = 0.5; // ~50km box around the bias point
      url += `&viewbox=${lng - delta},${lat + delta},${lng + delta},${lat - delta}&bounded=1`;
    }

    const upstream = await fetch(url);
    if (!upstream.ok) {
      const text = await upstream.text();
      console.error('[api/geocode] LocationIQ returned', upstream.status, text);
      return Response.json({ error: 'upstream error', status: upstream.status }, { status: 502 });
    }
    const data = await upstream.json();
    return Response.json(data);
  } catch (err) {
    console.error('[api/geocode] handler crashed:', err);
    return Response.json({ error: 'internal error' }, { status: 500 });
  }
}