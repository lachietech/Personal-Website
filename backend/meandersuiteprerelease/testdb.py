from flask import Flask, redirect, render_template, request, session, url_for
from time import strftime, time
import pandas as pd
from statistics import mode
import requests
import mysql.connector as mysql
from flask_bcrypt import Bcrypt 
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
bcrypt = Bcrypt(app)
app.secret_key = os.getenv('SECRET_KEY')
db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
cursor = db.cursor()

def login():
    password = input("pw")
    username = input("user")
    accesscode = input("AC")
    sql = "SELECT * FROM `dbmaster`.User WHERE accesscode = %s AND username = %s"
    u = (accesscode, username)
    cursor.execute(sql, u)
    myresult = cursor.fetchall()
    db.commit()
    if bcrypt.check_password_hash(myresult[0][2].encode("utf-8"), password):
        if myresult[0][3] == "1":
            session['logged_in'] = True
            session['lvl'] = 1
            session['username'] = username
            return print("pass")
        if myresult[0][3] == "2":
            session['logged_in'] = True
            session['lvl'] = 2
            session['username'] = username
            return print("pass")
        if myresult[0][3] == "3":
            session['logged_in'] = True
            session['lvl'] = 3
            session['username'] = username
            return print("pass")
    else:
        # If incorrect stay on the password page
        return print("pass")
print("ERR: EOS reached")