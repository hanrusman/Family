export async function searchLocations(query) {
  if (query.trim().length < 2) return [];

  try {
    const params = new URLSearchParams({
      name: query.trim(),
      count: '5',
      language: 'nl',
      country_code: 'NL',
    });

    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`
    );

    if (!res.ok) return [];

    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
