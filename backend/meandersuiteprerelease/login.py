from flask import Flask, redirect, render_template, request, session, url_for
from time import strftime, time
import pandas as pd
from statistics import mode
import requests
import mysql.connector as mysql
import bcrypt
from dotenv import load_dotenv
import os


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

def register(username, password, email, first_name, last_name, locationl, locations, locationc):
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt) 
    cursor.execute("""SELECT * FROM MeanderSuite.users WHERE username = %s""", (username,))
    if len(cursor.fetchall()) > 0:
        return redirect(url_for('register'))
    else:
        cursor.execute("""INSERT INTO MeanderSuite.users (username, password, email, firstname, lastname, locationl, locations, locationc) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""", (username, hashed_password, email, first_name, last_name, locationl, locations, locationc))
        db.commit()
        return login(username, password)

def login(username, password):
    cursor.execute("SELECT * FROM MeanderSuite.users WHERE username = %s", (username,))
    user = cursor.fetchone()
    user2 = cursor.fetchall()
    print("User2:", user2)
    db.commit()
    if user:
        if bcrypt.checkpw(password.encode('utf-8'), user[2].encode('utf-8')):
            session['logged_in'] = True
            session['username'] = user[1]
            session['first_name'] = user[4]
            session['last_name'] = user[5]
            session['locationl'] = user[6]
            session['locations'] = user[7]
            session['locationc'] = user[8]
            return redirect(url_for('suite'))
        
        else:
            # If incorrect stay on the password page
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))