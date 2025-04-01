from flask import Flask, redirect, render_template, request, session, url_for
from time import strftime, time
import pandas as pd
import numpy as np
from statistics import mode
import requests
import mysql.connector as mysql 
from dotenv import load_dotenv
import os
from datetime import datetime
import json

if load_dotenv("/Users/lniel/OneDrive/BUSINESS/Coding/personal website/.env"):
    pass
else:
    if load_dotenv("/var/www/.env"):
        pass
    else:
        print("Dotenv not found")

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

api_key = os.getenv('API_KEY')

presets = {
    "Af": {
        "comfort_temp": 26,
        "humidity_optimal": 80,
        "max_uv_tolerated": 10,
        "wind_tolerance": 20,
        "gust_tolerance": 30,
        "pressure_norm": 1010
    },
    "Am": {
        "comfort_temp": 26,
        "humidity_optimal": 78,
        "max_uv_tolerated": 10,
        "wind_tolerance": 22,
        "gust_tolerance": 32,
        "pressure_norm": 1011
    },
    "Aw": {
        "comfort_temp": 28,
        "humidity_optimal": 70,
        "max_uv_tolerated": 11,
        "wind_tolerance": 25,
        "gust_tolerance": 35,
        "pressure_norm": 1010
    },
    "BWh": {
        "comfort_temp": 30,
        "humidity_optimal": 30,
        "max_uv_tolerated": 12,
        "wind_tolerance": 30,
        "gust_tolerance": 40,
        "pressure_norm": 1012
    },
    "BWk": {
        "comfort_temp": 26,
        "humidity_optimal": 35,
        "max_uv_tolerated": 10,
        "wind_tolerance": 28,
        "gust_tolerance": 38,
        "pressure_norm": 1013
    },
    "BSh": {
        "comfort_temp": 29,
        "humidity_optimal": 40,
        "max_uv_tolerated": 11,
        "wind_tolerance": 27,
        "gust_tolerance": 37,
        "pressure_norm": 1012
    },
    "BSk": {
        "comfort_temp": 24,
        "humidity_optimal": 45,
        "max_uv_tolerated": 9,
        "wind_tolerance": 25,
        "gust_tolerance": 35,
        "pressure_norm": 1013
    },
    "Csa": {
        "comfort_temp": 26,
        "humidity_optimal": 55,
        "max_uv_tolerated": 10,
        "wind_tolerance": 20,
        "gust_tolerance": 30,
        "pressure_norm": 1014
    },
    "Csb": {
        "comfort_temp": 24,
        "humidity_optimal": 60,
        "max_uv_tolerated": 9,
        "wind_tolerance": 18,
        "gust_tolerance": 28,
        "pressure_norm": 1014
    },
    "Csc": {
        "comfort_temp": 22,
        "humidity_optimal": 65,
        "max_uv_tolerated": 8,
        "wind_tolerance": 16,
        "gust_tolerance": 26,
        "pressure_norm": 1015
    },
    "Cwa": {
        "comfort_temp": 27,
        "humidity_optimal": 70,
        "max_uv_tolerated": 10,
        "wind_tolerance": 22,
        "gust_tolerance": 32,
        "pressure_norm": 1012
    },
    "Cwb": {
        "comfort_temp": 24,
        "humidity_optimal": 75,
        "max_uv_tolerated": 9,
        "wind_tolerance": 20,
        "gust_tolerance": 30,
        "pressure_norm": 1013
    },
    "Cwc": {
        "comfort_temp": 22,
        "humidity_optimal": 78,
        "max_uv_tolerated": 8,
        "wind_tolerance": 18,
        "gust_tolerance": 28,
        "pressure_norm": 1014
    },
    "Cfa": {
        "comfort_temp": 26,
        "humidity_optimal": 70,
        "max_uv_tolerated": 10,
        "wind_tolerance": 21,
        "gust_tolerance": 31,
        "pressure_norm": 1013
    },
    "Cfb": {
        "comfort_temp": 23,
        "humidity_optimal": 75,
        "max_uv_tolerated": 9,
        "wind_tolerance": 19,
        "gust_tolerance": 29,
        "pressure_norm": 1014
    },
    "Cfc": {
        "comfort_temp": 21,
        "humidity_optimal": 78,
        "max_uv_tolerated": 8,
        "wind_tolerance": 17,
        "gust_tolerance": 27,
        "pressure_norm": 1015
    },
    "Dsa": {
        "comfort_temp": 22,
        "humidity_optimal": 60,
        "max_uv_tolerated": 9,
        "wind_tolerance": 20,
        "gust_tolerance": 30,
        "pressure_norm": 1013
    },
    "Dsb": {
        "comfort_temp": 20,
        "humidity_optimal": 65,
        "max_uv_tolerated": 8,
        "wind_tolerance": 18,
        "gust_tolerance": 28,
        "pressure_norm": 1014
    },
    "Dsc": {
        "comfort_temp": 18,
        "humidity_optimal": 70,
        "max_uv_tolerated": 7,
        "wind_tolerance": 16,
        "gust_tolerance": 26,
        "pressure_norm": 1015
    },
    "Dsd": {
        "comfort_temp": 16,
        "humidity_optimal": 75,
        "max_uv_tolerated": 6,
        "wind_tolerance": 14,
        "gust_tolerance": 24,
        "pressure_norm": 1015
    },
    "Dwa": {
        "comfort_temp": 21,
        "humidity_optimal": 65,
        "max_uv_tolerated": 9,
        "wind_tolerance": 20,
        "gust_tolerance": 30,
        "pressure_norm": 1013
    },
    "Dwb": {
        "comfort_temp": 19,
        "humidity_optimal": 70,
        "max_uv_tolerated": 8,
        "wind_tolerance": 18,
        "gust_tolerance": 28,
        "pressure_norm": 1014
    },
    "Dwc": {
        "comfort_temp": 17,
        "humidity_optimal": 75,
        "max_uv_tolerated": 7,
        "wind_tolerance": 16,
        "gust_tolerance": 26,
        "pressure_norm": 1015
    },
    "Dwd": {
        "comfort_temp": 15,
        "humidity_optimal": 78,
        "max_uv_tolerated": 6,
        "wind_tolerance": 14,
        "gust_tolerance": 24,
        "pressure_norm": 1015
    },
    "Dfa": {
        "comfort_temp": 24,
        "humidity_optimal": 65,
        "max_uv_tolerated": 10,
        "wind_tolerance": 21,
        "gust_tolerance": 31,
        "pressure_norm": 1013
    },
    "Dfb": {
        "comfort_temp": 22,
        "humidity_optimal": 70,
        "max_uv_tolerated": 9,
        "wind_tolerance": 19,
        "gust_tolerance": 29,
        "pressure_norm": 1014
    },
    "Dfc": {
        "comfort_temp": 20,
        "humidity_optimal": 75,
        "max_uv_tolerated": 8,
        "wind_tolerance": 17,
        "gust_tolerance": 27,
        "pressure_norm": 1015
    },
    "Dfd": {
        "comfort_temp": 18,
        "humidity_optimal": 78,
        "max_uv_tolerated": 7,
        "wind_tolerance": 15,
        "gust_tolerance": 25,
        "pressure_norm": 1015
    },
    "ET": {
        "comfort_temp": 10,
        "humidity_optimal": 70,
        "max_uv_tolerated": 7,
        "wind_tolerance": 15,
        "gust_tolerance": 25,
        "pressure_norm": 1016
    },
    "EF": {
        "comfort_temp": -5,
        "humidity_optimal": 65,
        "max_uv_tolerated": 6,
        "wind_tolerance": 10,
        "gust_tolerance": 20,
        "pressure_norm": 1017
    }
}

def dbcheck():
    db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
    cursor = db.cursor()

    locl = session["locationl"]
    locs = session["locations"]
    locc = session["locationc"]

    # check db to see if the location is already in the database.
    cursor.execute("""SELECT last_updated FROM MeanderSuite.locations WHERE locationl = %s AND locations = %s AND locationc = %s""", (locl, locs, locc, ))
    result = cursor.fetchone()

    if result:
        last_updated = result[0]  # this is a datetime obj
        if last_updated is None:
            db.commit()
            db.close()
            return 2
        if (datetime.now() - last_updated).total_seconds() < 3600:
            db.commit()
            db.close()
            return 1  # fresh
        else:
            db.commit()
            db.close()
            return 2  # stale
    else:
        db.commit()
        db.close()
        return 2  # no record

def run():
    dbcheckr = dbcheck()
    # Get the weather data from the database if the locations are available and valid.
    if dbcheckr == 1:
        # run the severity AI which will return the values in a form that can be placed on the website. potentially json.
        return severity()
    # If the location data is outdated or nonexistent then get new data from api and replace it in the database.
    if dbcheckr == 2:
        getnewdata()
        # run the severity AI which will return the values in a form that can be placed on the website. potentially json.
        return severity()
    

def getnewdata():
    db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
    cursor = db.cursor()

    query = str(session["locationl"] + " " + session["locations"] + " " + session["locations"])
    call = f'https://api.weatherapi.com/v1/forecast.json?key={api_key}&q={query}&days=1&aqi=no&alerts=yes'
    json_data = requests.get(call).json()

    loc = json_data['location']
    current = json_data['current']
    forecast_day = json_data['forecast']['forecastday'][0]
    astro = forecast_day['astro']
    hourly = forecast_day['hour']
    alerts = json_data['alerts']['alert'] if json_data['alerts']['alert'] else []

    # Match or insert location
    cursor.execute("""SELECT id FROM MeanderSuite.locations WHERE locationl = %s AND locations = %s AND locationc = %s""", (session["locationl"], session["locations"], session["locationc"]))
    result = cursor.fetchone()

    if result:
        location_id = result[0]
    else:
        lon = loc["lon"]
        lat = loc["lat"]
        res = requests.get(f"https://climate.mapresso.com/api/koeppen/?lat={lat}&lon={lon}").json() 
        zone = res["data"][0]["code"]
        cursor.execute("""INSERT INTO MeanderSuite.locations (locationl, locations, locationc, zone, last_updated) VALUES (%s, %s, %s, %s, NULL)""", (session["locationl"], session["locations"], session["locationc"], zone))
        db.commit()
        location_id = cursor.lastrowid

    now = datetime.now()

    # CLEAR existing data (ALL tables)
    cursor.execute("DELETE FROM MeanderSuite.weather_current WHERE location_id = %s", (location_id,))
    cursor.execute("DELETE FROM MeanderSuite.weather_forecast_daily WHERE location_id = %s", (location_id,))
    cursor.execute("DELETE FROM MeanderSuite.weather_forecast_hourly WHERE location_id = %s", (location_id,))
    cursor.execute("DELETE FROM MeanderSuite.weather_forecast_astro WHERE location_id = %s", (location_id,))
    cursor.execute("DELETE FROM MeanderSuite.weather_alerts WHERE location_id = %s", (location_id,))

    # Insert weather_current
    cursor.execute("""INSERT INTO MeanderSuite.weather_current (location_id, last_updated, temp_c, is_day, wind_kph, wind_degree, wind_dir, pressure_mb, precip_mm, humidity, cloud, feelslike_c, windchill_c, heatindex_c, dewpoint_c, vis_km, uv, gust_kph) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", ( location_id, datetime.strptime(current['last_updated'], "%Y-%m-%d %H:%M"), current['temp_c'], current['is_day'], current['wind_kph'], current['wind_degree'], current['wind_dir'], current['pressure_mb'], current['precip_mm'], current['humidity'], current['cloud'], current['feelslike_c'], current['windchill_c'], current['heatindex_c'], current['dewpoint_c'], current['vis_km'], current['uv'], current['gust_kph']))

    # Insert weather_forecast_daily
    day = forecast_day['day']
    cursor.execute("""INSERT INTO MeanderSuite.weather_forecast_daily (location_id, forecast_date, maxtemp_c, mintemp_c, avgtemp_c, maxwind_kph, totalprecip_mm, avghumidity, daily_chance_of_rain, uv) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", (location_id, datetime.strptime(forecast_day['date'], "%Y-%m-%d"), day['maxtemp_c'], day['mintemp_c'], day['avgtemp_c'], day['maxwind_kph'], day['totalprecip_mm'], day['avghumidity'], day['daily_chance_of_rain'], day['uv']))

    # Insert weather_forecast_astro
    cursor.execute("""INSERT INTO MeanderSuite.weather_forecast_astro (location_id, forecast_date, sunrise, sunset, moonrise, moonset, moon_phase, moon_illumination, is_moon_up, is_sun_up) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", (location_id, datetime.strptime(forecast_day['date'], "%Y-%m-%d"), astro['sunrise'], astro['sunset'], astro['moonrise'], astro['moonset'], astro['moon_phase'], astro['moon_illumination'], astro['is_moon_up'], astro['is_sun_up']))

    # Insert weather_forecast_hourly
    hourly_insert = """INSERT INTO MeanderSuite.weather_forecast_hourly (location_id, forecast_time, temp_c, is_day, wind_kph, wind_degree, wind_dir, pressure_mb, precip_mm, humidity, cloud, feelslike_c, windchill_c, heatindex_c, dewpoint_c, will_it_rain, chance_of_rain, vis_km, gust_kph, uv) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""

    for h in hourly:
        cursor.execute(hourly_insert, (location_id, datetime.strptime(h['time'], "%Y-%m-%d %H:%M"), h['temp_c'], h['is_day'], h['wind_kph'], h['wind_degree'], h['wind_dir'], h['pressure_mb'], h['precip_mm'], h['humidity'], h['cloud'], h['feelslike_c'], h['windchill_c'], h['heatindex_c'], h['dewpoint_c'], h['will_it_rain'], h['chance_of_rain'], h['vis_km'], h['gust_kph'], h['uv']))

    # Insert weather_alerts
    if alerts:
        for alert in alerts:
            cursor.execute("""INSERT INTO MeanderSuite.weather_alerts (location_id, headline, msg_type, severity, urgency, areas, category, certainty, event, note, effective, expires, `desc`, instruction) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", (location_id, alert.get('headline', ''), alert.get('msgtype', ''), alert.get('severity', ''), alert.get('urgency', ''), alert.get('areas', ''), alert.get('category', ''), alert.get('certainty', ''), alert.get('event', ''), alert.get('note', ''), alert.get('effective', None), alert.get('expires', None), alert.get('desc', ''), alert.get('instruction', '')))

    # Update location timestamp
    cursor.execute("UPDATE MeanderSuite.locations SET last_updated = %s WHERE id = %s", (now, location_id))
    db.commit()
    db.close()

def severity():
    db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
    cursor = db.cursor(dictionary=True)
    def get_weather_data(locationl, locations, locationc):
        # Get location id
        cursor.execute("""SELECT id FROM MeanderSuite.locations WHERE locationl = %s AND locations = %s AND locationc = %s""", (locationl, locations, locationc))
        location = cursor.fetchone()
        location_id = location['id']
        cursor.execute("""SELECT zone FROM MeanderSuite.locations WHERE locationl = %s AND locations = %s AND locationc = %s""", (locationl, locations, locationc))
        zonee = cursor.fetchone()
        zone = zonee['zone']

        # Get current
        cursor.execute("SELECT * FROM MeanderSuite.weather_current WHERE location_id = %s", (location_id,))
        current = cursor.fetchone()

        # Get daily
        cursor.execute("SELECT * FROM MeanderSuite.weather_forecast_daily WHERE location_id = %s", (location_id,))
        daily = cursor.fetchone()

        # Get astro
        cursor.execute("SELECT * FROM MeanderSuite.weather_forecast_astro WHERE location_id = %s", (location_id,))
        astro = cursor.fetchone()

        # Get hourly
        cursor.execute("SELECT * FROM MeanderSuite.weather_forecast_hourly WHERE location_id = %s ORDER BY forecast_time", (location_id,))
        hourly = cursor.fetchall()

        # Get alerts
        cursor.execute("SELECT * FROM MeanderSuite.weather_alerts WHERE location_id = %s", (location_id,))
        alerts = cursor.fetchall()

        # Build dict to mimic the original JSON structure
        weather_data = {
            "location": {
                "locationl": locationl,
                "locations": locations,
                "locationc": locationc,
                "zone": zone
            },
            "current": current,
            "daily_forcast": daily,
            "astro": astro,
            "hourly_forcast": hourly,
            "alerts": alerts
        }
        return weather_data
    
    weather_data = get_weather_data(session["locationl"], session["locations"], session["locationc"])

    # Extract data from the weather data dictionary
    temp = weather_data['current']['temp_c']
    feelslike = weather_data['current']['feelslike_c']
    max_rain_mm = weather_data["daily_forcast"]['totalprecip_mm']
    chance_of_rain = weather_data["daily_forcast"]['daily_chance_of_rain']
    cloud = weather_data['current']['cloud']
    humidity = weather_data['current']['humidity']
    gust = weather_data['current']['gust_kph']
    pressure = weather_data['current']['pressure_mb']
    moon_illumination = weather_data['astro']['moon_illumination']
    is_day = weather_data['current']['is_day']
    alert_count = len(weather_data['alerts'])
    uv = weather_data['current']['uv']
    wind = weather_data['current']['wind_kph']
    precip = weather_data['current']['precip_mm']

    profile = presets[weather_data["location"]["zone"]]

    def calculate_cwis(astrology_factor=0, age_modifier=1.0):
        

        # Profile-driven variables
        comfort_temp = profile["comfort_temp"]
        humidity_optimal = profile["humidity_optimal"]
        max_uv_tolerated = profile["max_uv_tolerated"]
        wind_tolerance = profile["wind_tolerance"]
        gust_tolerance = profile["gust_tolerance"]
        pressure_norm = profile["pressure_norm"]
    
        # Adaptive Penalties
        Pt = 1.4 * abs(temp - comfort_temp)
        Pf = 1.1 * abs(feelslike - comfort_temp)
        Pr = min(max_rain_mm * 5, 20) + (chance_of_rain * 0.1)
        Pc = (cloud / 100) * 8
        Ph = abs(humidity - humidity_optimal) * 0.18
        Pw = (gust / gust_tolerance) * 12
        Pwspd = (wind / wind_tolerance) * 8
        Pp = abs(pressure - pressure_norm) * 0.04
        Pu = (uv / max_uv_tolerated) * 5
        Pm = (moon_illumination / 100) * 5
        Pa = alert_count * 15
        Pn = 0 if is_day else 10
        As = astrology_factor * 5

        # CWIS ULTRA Score
        CWIS = (100 - (Pt + Pf + Pr + Pc + Ph + Pw + Pwspd + Pp + Pu + Pm + Pa + Pn) + As) * age_modifier
        return round(CWIS, 2)

    def interpret_cwis_score(cwis_score):
        if cwis_score >= 85:
            return {
                "Tier": "Optimal",
                "Mood": "Very Positive",
                "Behaviour": "High engagement, good behavior, cooperative, playful",
                "Notes": "Almost perfect environmental harmony. Kids will likely have great days even with minor stressors. Expect creativity and smooth social interactions."
            }
        elif 70 <= cwis_score <= 84:
            return {
                "Tier": "Favourable",
                "Mood": "Generally Positive",
                "Behaviour": "Mostly settled, occasional minor mood shifts",
                "Notes": "The day will likely be manageable. You might see mild irritability at times but nothing outside the norm. Situational support may completely offset it."
            }
        elif 55 <= cwis_score <= 69:
            return {
                "Tier": "Mixed",
                "Mood": "Unstable",
                "Behaviour": "Frequent mood changes, moderate defiance, clinginess",
                "Notes": "Weather is sending mixed signals. Kids may react differently depending on internal or external stressors. Prepare for more mood regulation activities."
            }
        elif 40 <= cwis_score <= 54:
            return {
                "Tier": "Difficult",
                "Mood": "Negative",
                "Behaviour": "Low patience, emotional outbursts, oppositional, restless",
                "Notes": "Conditions aren't ideal. Emotional regulation could be challenged. Increased chance of arguments, tears, or attention-seeking. Plan for soft landings and downtime."
            }
        elif 25 <= cwis_score <= 39:
            return {
                "Tier": "Challenging",
                "Mood": "Highly Negative",
                "Behaviour": "Aggressive, defiant, anxious, highly reactive",
                "Notes": "Expect turbulent behavior. Easily triggered emotions, withdrawal, tantrums, or sensory overload. Recommended: flexible routines and calming strategies."
            }
        elif 0 <= cwis_score <= 24:
            return {
                "Tier": "Extreme",
                "Mood": "Critical",
                "Behaviour": "Meltdowns, shutdowns, high stress, sensory sensitivity",
                "Notes": "Environmental disaster mode. Kids are highly likely to be overwhelmed or dysregulated. Prepare for backup plans, reduced demands, and a lot of support."
            }
        else:  # Negative Scores
            return {
                "Tier": "Severe Warning",
                "Mood": "Crisis Zone",
                "Behaviour": "Severe dysregulation, potential unsafe behaviors",
                "Notes": "Very rare. This is likely only hit by combining bad weather, alerts, night-time, astrology negatives, and more. Full intervention likely needed. Avoid ambitious plans."
            }
    
    cwis_score = calculate_cwis()
    result = interpret_cwis_score(cwis_score)

    severityrating = result["Tier"]
    mood = result["Mood"]
    behaviour = result["Behaviour"]
    msg = result["Notes"]

    display_weather = [temp,humidity,cloud,uv,wind,precip,cwis_score,severityrating,mood,behaviour,msg]

    db.commit()
    db.close()
    return display_weather