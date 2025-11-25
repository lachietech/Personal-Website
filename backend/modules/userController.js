// userWeatherController.js
import axios from 'axios';
import bcrypt from 'bcrypt';
import UserWeatherRecord from '../models/users.js';
import dotenv from 'dotenv';
dotenv.config();

const WEATHER_API_KEY = process.env.API_KEY;

// Register user and fetch weather + zone
export async function registerUserWithWeather(userData) {
    const { username, password, email, first_name, last_name, location } = userData;

    const existingUser = await UserWeatherRecord.findOne({ username });
    if (existingUser) throw new Error('Username already exists');

    const hashedPassword = await bcrypt.hash(password, 12);

    const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${location.local},${location.state},${location.country}&days=1&aqi=no&alerts=yes`;
    const weatherRes = await axios.get(weatherUrl);
    const weatherData = weatherRes.data;

    const { lat, lon } = weatherData.location;
    const climateUrl = `https://climate.mapresso.com/api/koeppen/?lat=${lat}&lon=${lon}`;
    const climateRes = await axios.get(climateUrl);
    const zone = climateRes.data.data[0].code;

    const newUser = new UserWeatherRecord({
        username,
        password: hashedPassword,
        email,
        first_name,
        last_name,
        location,
        timestamp: new Date(),
        zone,
        data: weatherData
    });

    await newUser.save();
    return newUser;
}

// Login user
export async function loginUser({ username, password }) {
    const user = await UserWeatherRecord.findOne({ username });
    if (!user) throw new Error('Invalid username or password');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid username or password');

    return user;
}

// Update weather and timestamp
export async function updateWeatherForUser(username) {
    const user = await UserWeatherRecord.findOne({ username });
    if (!user) throw new Error('User not found');

    const location = user.location;
    const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${location.local},${location.state},${location.country}&days=1&aqi=no&alerts=yes`;
    const weatherRes = await axios.get(weatherUrl);
    const weatherData = weatherRes.data;

    user.data = weatherData;
    user.timestamp = new Date();
    await user.save();

    return user;
}

// Change location and auto-update weather/zone
export async function updateUserLocation(username, newLocation) {
    const user = await UserWeatherRecord.findOne({ username });
    if (!user) throw new Error('User not found');

    const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${newLocation.local},${newLocation.state},${newLocation.country}&days=1&aqi=no&alerts=yes`;
    const weatherRes = await axios.get(weatherUrl);
    const weatherData = weatherRes.data;

    const { lat, lon } = weatherData.location;
    const climateUrl = `https://climate.mapresso.com/api/koeppen/?lat=${lat}&lon=${lon}`;
    const climateRes = await axios.get(climateUrl);
    const zone = climateRes.data.data[0].code;

    user.location = newLocation;
    user.zone = zone;
    user.data = weatherData;
    user.timestamp = new Date();
    await user.save();

    return user;
}