import axios from "axios";

function locationQuery(location) {
  return [location.local, location.state, location.country]
    .filter(Boolean)
    .join(",");
}

export async function fetchWeather(location) {
  const response = await axios.get(
    "https://api.weatherapi.com/v1/forecast.json",
    {
      params: {
        key: process.env.API_KEY,
        q: locationQuery(location),
        days: 1,
        aqi: "no",
        alerts: "yes",
      },
      timeout: 10000,
    },
  );
  return response.data;
}

export async function fetchClimateZone({ lat, lon }) {
  const response = await axios.get(
    "https://climate.mapresso.com/api/koeppen/",
    { params: { lat, lon }, timeout: 10000 },
  );
  const zone = response.data?.data?.[0]?.code;
  if (!zone)
    throw new Error("Unable to determine the climate zone for this location");
  return zone;
}
