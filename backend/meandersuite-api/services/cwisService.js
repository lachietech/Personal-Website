import zonePresets from "../presets/zonepresets.json" with { type: "json" };
import { refreshUserWeather } from "./userService.js";

function calculateScore(user) {
  const { data } = user;
  const profile = zonePresets[user.zone] || zonePresets.Cfa;
  const day = data.forecast.forecastday[0];
  const penalties = [
    1.4 * Math.abs(data.current.temp_c - profile.comfort_temp),
    1.1 * Math.abs(data.current.feelslike_c - profile.comfort_temp),
    Math.min(day.day.totalprecip_mm * 5, 20) +
      day.day.daily_chance_of_rain * 0.1,
    (data.current.cloud / 100) * 8,
    Math.abs(data.current.humidity - profile.humidity_optimal) * 0.18,
    (data.current.gust_kph / profile.gust_tolerance) * 12,
    (data.current.wind_kph / profile.wind_tolerance) * 8,
    Math.abs(data.current.pressure_mb - profile.pressure_norm) * 0.04,
    (data.current.uv / profile.max_uv_tolerated) * 5,
    (Number(day.astro.moon_illumination) / 100) * 5,
    (data.alerts?.alert?.length || 0) * 15,
    data.current.is_day ? 0 : 10,
  ];
  return (
    Math.round(
      (100 - penalties.reduce((sum, penalty) => sum + penalty, 0)) * 100,
    ) / 100
  );
}

function interpret(score) {
  if (score >= 85)
    return {
      Tier: "Optimal",
      Mood: "Very Positive",
      Behaviour: "High engagement, cooperative",
      Notes: "Perfect conditions for children.",
    };
  if (score >= 70)
    return {
      Tier: "Favourable",
      Mood: "Generally Positive",
      Behaviour: "Mostly settled",
      Notes: "A manageable day with mild ups and downs.",
    };
  if (score >= 55)
    return {
      Tier: "Mixed",
      Mood: "Unstable",
      Behaviour: "Frequent mood changes",
      Notes: "Mixed conditions; watch for triggers.",
    };
  if (score >= 40)
    return {
      Tier: "Difficult",
      Mood: "Negative",
      Behaviour: "Low patience, emotional outbursts",
      Notes: "Expect regulation challenges.",
    };
  if (score >= 25)
    return {
      Tier: "Challenging",
      Mood: "Highly Negative",
      Behaviour: "Aggressive, anxious",
      Notes: "Plan calming strategies.",
    };
  if (score >= 0)
    return {
      Tier: "Extreme",
      Mood: "Critical",
      Behaviour: "Meltdowns, high stress",
      Notes: "Support and safety first.",
    };
  return {
    Tier: "Severe Warning",
    Mood: "Crisis Zone",
    Behaviour: "Unsafe behaviours likely",
    Notes: "Full intervention recommended.",
  };
}

export async function getCwisAnalysis(user) {
  if (
    !user.timestamp ||
    Date.now() - new Date(user.timestamp).getTime() > 60 * 60 * 1000
  )
    user = await refreshUserWeather(user.username);
  const score = calculateScore(user);
  return {
    temp: user.data.current.temp_c,
    cloud: user.data.current.cloud,
    humidity: user.data.current.humidity,
    uv: user.data.current.uv,
    wind: user.data.current.wind_kph,
    precip: user.data.current.precip_mm,
    score,
    ...interpret(score),
  };
}
