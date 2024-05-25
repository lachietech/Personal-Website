from flask import Flask, redirect, render_template, request, session, url_for
from time import strftime, time
import pandas as pd
from statistics import mode
import requests
import mysql.connector as mysql
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
import os

if load_dotenv("/Users/lniel/OneDrive - Department of Education/Coding/personal website/.env"):
    print("Dotenv loaded")
    pass
else:
    if load_dotenv("/var/www/.env"):
        print("Dotenv loaded")
        pass
    else:
        print("Dotenv not found")

app = Flask(__name__)
bcrypt = Bcrypt(app)
app.secret_key = os.getenv('SECRET_KEY')
#db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = os.getenv('USER'), password = os.getenv('PASSWORD'))
#cursor = db.cursor()