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

def dbcheck():
    db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
    cursor = db.cursor()

    locl = session["locationl"]
    locs = session["locations"]
    locc = session["locationc"]
    print("Session Location:", locl, locs, locc)
    # check db to see if the location is already in the database.
    cursor.execute("""SELECT last_updated FROM MeanderSuite.locations WHERE locationl = %s AND locations = %s AND locationc = %s""", (locl, locs, locc, ))
    result = cursor.fetchone()
    print("DB Check result:", result)

    if result:
        last_updated = result[0]  # this is a datetime obj
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

    query = str(session["locationl"] + " " + session["locations"] + " " + session["locationc"])
    call = f'https://api.weatherapi.com/v1/forecast.json?key={api_key}&q={query}&days=1&aqi=no&alerts=yes'
    json_data = requests.get(call).json()

    current = json_data['current']
    forecast_day = json_data['forecast']['forecastday'][0]
    hourly = forecast_day['hour']

    # Match or insert location
    cursor.execute("""SELECT id FROM MeanderSuite.locations WHERE locationl = %s AND locations = %s AND locationc = %s""", (session["locationl"], session["locations"], session["locationc"]))
    result = cursor.fetchone()

    if result:
        location_id = result[0]
    else:
        cursor.execute("""INSERT INTO MeanderSuite.locations (locationl, locations, locationc, last_updated) VALUES (%s, %s, %s, NULL)""", (session["locationl"], session["locations"], session["locationc"]))
        location_id = cursor.lastrowid

    now = datetime.now()

    # Clear old current data for that location
    cursor.execute("""DELETE FROM MeanderSuite.weather_current WHERE location_id = %s""", (location_id, ))

    # Insert current weather
    cursor.execute("""INSERT INTO MeanderSuite.weather_current (location_id, last_updated, temp_c, is_day, wind_kph, wind_degree, wind_dir, pressure_mb, precip_mm, humidity, cloud, feelslike_c, windchill_c, heatindex_c, dewpoint_c, vis_km, uv, gust_kph) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", 
                   (location_id, datetime.strptime(current['last_updated'], "%Y-%m-%d %H:%M"), current['temp_c'], current['is_day'], current['wind_kph'], current['wind_degree'], current['wind_dir'], current['pressure_mb'], current['precip_mm'], current['humidity'], current['cloud'], current['feelslike_c'], current['windchill_c'], current['heatindex_c'], current['dewpoint_c'], current['vis_km'], current['uv'], current['gust_kph']))

    # Clear old daily data for that location
    cursor.execute("""DELETE FROM MeanderSuite.weather_forecast_daily WHERE location_id = %s""", (location_id, ))

    # Insert daily forecast
    day = forecast_day['day']
    cursor.execute("""INSERT INTO MeanderSuite.weather_forecast_daily (location_id, forecast_date, maxtemp_c, mintemp_c, avgtemp_c, maxwind_kph, totalprecip_mm, avghumidity, daily_chance_of_rain, uv) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""", (
        location_id, datetime.strptime(forecast_day['date'], "%Y-%m-%d"), day['maxtemp_c'], day['mintemp_c'], day['avgtemp_c'], day['maxwind_kph'], day['totalprecip_mm'], day['avghumidity'], day['daily_chance_of_rain'], day['uv']))

    # Clear old hourly data for that location
    cursor.execute("""DELETE FROM MeanderSuite.weather_forecast_hourly WHERE location_id = %s""", (location_id, ))

    # Insert hourly forecast
    hourly_insert = """INSERT INTO MeanderSuite.weather_forecast_hourly (location_id, forecast_time, temp_c, is_day, wind_kph, wind_degree, wind_dir, pressure_mb, precip_mm, humidity, cloud, feelslike_c, windchill_c, heatindex_c, dewpoint_c, will_it_rain, chance_of_rain, vis_km, gust_kph, uv) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    for h in hourly:
        cursor.execute(hourly_insert, (location_id, datetime.strptime(h['time'], "%Y-%m-%d %H:%M"), h['temp_c'], h['is_day'], h['wind_kph'], h['wind_degree'], h['wind_dir'], h['pressure_mb'], h['precip_mm'], h['humidity'], h['cloud'], h['feelslike_c'], h['windchill_c'], h['heatindex_c'], h['dewpoint_c'], h['will_it_rain'], h['chance_of_rain'], h['vis_km'], h['gust_kph'], h['uv']))

    # Update last_updated on locations table
    cursor.execute("""UPDATE MeanderSuite.locations SET last_updated = %s WHERE id = %s""", (now, location_id))
    db.commit()
    db.close()

def severity():
    db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
    cursor = db.cursor(dictionary=True)
    def get_weather_data(locationl, locations, locationc):
        cursor.execute("""SELECT id FROM MeanderSuite.locations WHERE locationl = %s AND locations = %s AND locationc = %s""", (locationl, locations, locationc))
        location = cursor.fetchone()
        location_id = location['id']

        cursor.execute("SELECT * FROM MeanderSuite.weather_current WHERE location_id = %s", (location_id,))
        current = cursor.fetchone()

        cursor.execute("SELECT * FROM MeanderSuite.weather_forecast_daily WHERE location_id = %s", (location_id,))
        daily = cursor.fetchone()

        cursor.execute("SELECT * FROM MeanderSuite.weather_forecast_hourly WHERE location_id = %s ORDER BY forecast_time", (location_id,))
        hourly = cursor.fetchall()

        return {
            'location': {
                'locationl': locationl,
                'locations': locations,
                'locationc': locationc
            },
            'current': current,
            'daily_forecast': daily,
            'hourly_forecast': hourly
        }
    
    weather_data = get_weather_data(session["locationl"], session["locations"], session["locationc"])
    temp = weather_data['current']['temp_c']
    precip = weather_data['current']['precip_mm']
    humidity = weather_data['current']['humidity']
    wind = weather_data['current']['wind_kph']
    uv = weather_data['current']['uv']
    cloud = weather_data['current']['cloud']
    wind = weather_data['current']['wind_kph']
    gust = weather_data['current']['gust_kph']
    feelslike = weather_data['current']['feelslike_c']
    vis = weather_data['current']['vis_km']
    pressure = weather_data['current']['pressure_mb']
    
    if precip > 0: 
        is_raining = 1
    else: 
        is_raining = 0


    # CWIS MAX MODEL - Child Weather Impact Scorer (Pro Version)
    baseline = 1.5
    age_group = 'general'
    sensory_sensitive = False
    toubled = False

    # Adjustable weights (tuned for general population)
    alpha_temp = 0.5
    alpha_feelslike = 0.5
    alpha_humidity = 0.3
    alpha_wind = 0.2
    alpha_gust = 0.15
    alpha_precip = 0.4
    alpha_cloud = 0.3
    alpha_uv = 0.5
    alpha_vis = 0.3
    alpha_pressure = 0.2
    alpha_rain = 0.8

    # locational norms
    tnorm = 24
    pnorm = 1015

    # Sensory adjustments
    if sensory_sensitive:
        alpha_wind *= 1.5
        alpha_gust *= 1.5
        alpha_precip *= 1.5
        alpha_cloud *= 1.3

    # Age adjustments
    if age_group == 'toddler':
        alpha_temp *= 1.2
        alpha_feelslike *= 1.2
    elif age_group == 'teen':
        alpha_uv *= 0.8
        alpha_cloud *= 0.8

    #troubled adjustments
    if toubled:
        error = 0.3
    else:
        error = 0.0

    
    # Normalize factors
    temp_stress = abs(temp - tnorm) / 10
    feelslike_stress = abs(feelslike - tnorm) / 10
    humidity_ratio = humidity / 100
    wind_norm = wind / 10
    gust_norm = gust / 10
    precip_norm = min(precip / 10, 1)
    cloud_ratio = cloud / 100
    uv_stress = max(0, (5 - uv) / 5)
    vis_stress = max(0, (10 - vis) / 10)
    pressure_stress = abs(pnorm - pressure) / 50

    # CWIS calculation
    cwis = (baseline +
            alpha_temp * temp_stress +
            alpha_feelslike * feelslike_stress +
            alpha_humidity * humidity_ratio +
            alpha_wind * wind_norm +
            alpha_gust * gust_norm +
            alpha_precip * precip_norm +
            alpha_cloud * cloud_ratio +
            alpha_uv * uv_stress +
            alpha_vis * vis_stress +
            alpha_pressure * pressure_stress +
            alpha_rain * is_raining +
            error)
    
    if cwis < -1.5:
        severityrating = "Strongly Positive"
        msg = "Conditions are highly favorable. Expect elevated energy, smooth social interaction, and balanced mood even among sensitive or younger kids."
    elif -1.5 <= cwis < -0.5:
        severityrating = "Moderate Positive"
        msg = "Conditions are supportive. Kids are likely to be calm, engaged, and generally pleasant with minor fluctuations."
    elif -0.5 <= cwis < 0.5:
        severityrating = "Neutral"
        msg = "Weather is unlikely to strongly influence children's psychological states today. Mood will be dominated by internal or social factors."
    elif 0.5 <= cwis < 2.0:
        severityrating = "Mild Negative"
        msg = "Minor behavioral disturbances such as irritability, lower attention, or moodiness might be seen, particularly if the group is sensitive or tired."
    elif 2.0 <= cwis < 4.0:
        severityrating = "Moderate Negative"
        msg = "Noticeable mood and behavioral disturbances likely, such as increased restlessness, frustration, or lethargy. Teachers and caregivers may need to apply extra structure or patience."
    else:
        severityrating = "Strong Negative"
        msg = "High risk of significant disruptions. Outbursts, emotional volatility, sensory overload, or extreme fatigue may occur. Prepare calming strategies and structured activities."


    print(f"CWIS Score: {cwis}")
    print(f"Interpretation: {msg}")

    display_weather = [temp,humidity,cloud,uv,wind,precip,cwis,msg,severityrating]

    db.commit()
    db.close()
    return display_weather