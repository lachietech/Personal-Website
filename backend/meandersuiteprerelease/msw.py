from flask import Flask, redirect, render_template, request, session, url_for
from time import strftime, time
import pandas as pd
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
db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
cursor = db.cursor()
api_key = os.getenv('API_KEY')

def dbcheck():
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
            return 1  # fresh
        else:
            return 2  # stale
    else:
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

def severity():
    def get_weather_data(locationl, locations, locationc):
        cursor = db.cursor(dictionary=True)

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

    rank = 0

    #rank tempurature 
    if temp >= 16 and temp <= 35:
        rank += 1
    if temp >= 36 and temp <= 44:
        rank += 2
    if temp >= 6 and temp <= 15:
        rank += 2
    if temp >= 45:
        rank += 3
    if temp <= 5:
        rank += 3
    #rank humidity
    if humidity >= 20 and humidity <= 80:
        rank += 1
    if humidity >= 6 and humidity <= 19:
        rank += 2
    if humidity >= 81 and humidity <= 94:
        rank += 2
    if humidity >= 0 and humidity <= 5:
        rank += 3
    if humidity >= 95 and humidity <= 100:
        rank += 3
    #rank cloud percentage
    found = False
    for i in range(10):
        if found == False:
            for x in range(10):
                if found == False:
                    num = int(i * 10) + x
                    if cloud == num:
                        found = True
                if rank == 10 and cloud == 100:
                    found = True
            rank += 1
    #rank wind speed

    # send out data based on rankings
    #rank >= 20: #rank BLACK
    # rank >= 15 and rank <= 19: #rank RED
    # rank >= 10 and rank <= 14: #rank YELLOW
    # rank >= 4 and rank <= 9: #rank GREEN

    display_weather = [temp,humidity,cloud,uv,wind,precip]

    db.commit()
    return display_weather