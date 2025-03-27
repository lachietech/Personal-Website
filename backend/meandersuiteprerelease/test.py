import requests
import os
from flask import session
from dotenv import load_dotenv

if load_dotenv("/Users/lniel/OneDrive/BUSINESS/Coding/personal website/.env"):
    pass
else:
    if load_dotenv("/var/www/.env"):
        pass
    else:
        print("Dotenv not found")

api_key = os.getenv('API_KEY')



def run():
    query = str(session["locationl"] + " " + session["locations"] + " " + session["locationc"])
    call = f'https://api.weatherapi.com/v1/forecast.json?key={api_key}&q={query}&days=1&aqi=no&alerts=yes'
    data = requests.get(call).json()
    print(data)

run()