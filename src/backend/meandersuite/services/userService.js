import bcrypt from "bcrypt";
import UserWeatherRecord from "../models/UserWeatherRecord.js";
import { fetchClimateZone, fetchWeather } from "../utils/weatherClient.js";
import {
  getEmail,
  getOptionalString,
  getPassword,
  getUsername,
} from "../../utils/security.js";

function cleanLocation(location) {
  return {
    local: getOptionalString(location?.local, 120),
    state: getOptionalString(location?.state, 120),
    country: getOptionalString(location?.country, 120),
  };
}

export async function registerUser(userData) {
  const username = getUsername(userData.username);
  const location = cleanLocation(userData.location);
  if (await UserWeatherRecord.exists({ username }))
    throw new Error("Username already exists");
  const weather = await fetchWeather(location);
  const zone = await fetchClimateZone(weather.location);
  return UserWeatherRecord.create({
    username,
    password: await bcrypt.hash(getPassword(userData.password), 12),
    email: getEmail(userData.email),
    first_name: getOptionalString(userData.first_name, 80),
    last_name: getOptionalString(userData.last_name, 80),
    location,
    timestamp: new Date(),
    zone,
    data: weather,
  });
}

export async function authenticateUser({ username, password }) {
  const user = await UserWeatherRecord.findOne({
    username: getUsername(username),
  });
  if (!user || !(await bcrypt.compare(getPassword(password), user.password)))
    throw new Error("Invalid username or password");
  return user;
}

export async function refreshUserWeather(username) {
  const user = await UserWeatherRecord.findOne({
    username: getUsername(username),
  });
  if (!user) throw new Error("User not found");
  user.data = await fetchWeather(user.location);
  user.timestamp = new Date();
  await user.save();
  return user;
}
