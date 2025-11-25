import { registerUserWithWeather, loginUser, updateWeatherForUser, updateUserLocation } from './userController.js';
import zonePresets from '../presets/zonepresets.json' with { type: 'json' };
import dotenv from 'dotenv';
dotenv.config();

const WEATHER_API_KEY = process.env.API_KEY;

export function calculateCWIS(user) {
    const { data, zone } = user;
    const profile = zonePresets[zone] || zonePresets['Cfa'];

    const temp = data.current.temp_c;
    const feelslike = data.current.feelslike_c;
    const max_rain_mm = data.forecast.forecastday[0].day.totalprecip_mm;
    const chance_of_rain = data.forecast.forecastday[0].day.daily_chance_of_rain;
    const cloud = data.current.cloud;
    const humidity = data.current.humidity;
    const gust = data.current.gust_kph;
    const pressure = data.current.pressure_mb;
    const moon_illumination = parseFloat(data.forecast.forecastday[0].astro.moon_illumination);
    const is_day = data.current.is_day;
    const alerts = data.alerts?.alert || [];
    const uv = data.current.uv;
    const wind = data.current.wind_kph;
    const precip = data.current.precip_mm;

    const Pt = 1.4 * Math.abs(temp - profile.comfort_temp);
    const Pf = 1.1 * Math.abs(feelslike - profile.comfort_temp);
    const Pr = Math.min(max_rain_mm * 5, 20) + (chance_of_rain * 0.1);
    const Pc = (cloud / 100) * 8;
    const Ph = Math.abs(humidity - profile.humidity_optimal) * 0.18;
    const Pw = (gust / profile.gust_tolerance) * 12;
    const Pwspd = (wind / profile.wind_tolerance) * 8;
    const Pp = Math.abs(pressure - profile.pressure_norm) * 0.04;
    const Pu = (uv / profile.max_uv_tolerated) * 5;
    const Pm = (moon_illumination / 100) * 5;
    const Pa = alerts.length * 15;
    const Pn = is_day ? 0 : 10;

    const CWIS = 100 - (Pt + Pf + Pr + Pc + Ph + Pw + Pwspd + Pp + Pu + Pm + Pa + Pn);
    return Math.round(CWIS * 100) / 100;
}

export function interpretCWIS(score) {
    if (score >= 85) return { Tier: 'Optimal', Mood: 'Very Positive', Behaviour: 'High engagement, cooperative', Notes: 'Perfect conditions for kids.' };
    if (score >= 70) return { Tier: 'Favourable', Mood: 'Generally Positive', Behaviour: 'Mostly settled', Notes: 'A manageable day with mild ups/downs.' };
    if (score >= 55) return { Tier: 'Mixed', Mood: 'Unstable', Behaviour: 'Frequent mood changes', Notes: 'Mixed conditions, watch for triggers.' };
    if (score >= 40) return { Tier: 'Difficult', Mood: 'Negative', Behaviour: 'Low patience, emotional outbursts', Notes: 'Expect regulation challenges.' };
    if (score >= 25) return { Tier: 'Challenging', Mood: 'Highly Negative', Behaviour: 'Aggressive, anxious', Notes: 'Plan calming strategies.' };
    if (score >= 0) return { Tier: 'Extreme', Mood: 'Critical', Behaviour: 'Meltdowns, high stress', Notes: 'Support and safety first.' };
    return { Tier: 'Severe Warning', Mood: 'Crisis Zone', Behaviour: 'Unsafe behaviours likely', Notes: 'Full intervention recommended.' };
}

export function runCWISAnalysis(user) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (!user.timestamp || new Date(user.timestamp) < oneHourAgo) {
        updateWeatherForUser(user.username);
    }

    const score = calculateCWIS(user);
    const interpretation = interpretCWIS(score);
    const { data, zone } = user;
    return {
        "temp": data.current.temp_c,
        "cloud": data.current.cloud,
        "humidity": data.current.humidity,
        "uv": data.current.uv,
        "wind": data.current.wind_kph,
        "precip": data.current.precip_mm,
        score,
        ...interpretation
    };
}
