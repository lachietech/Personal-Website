from flask import Flask, redirect, render_template, request, session, url_for
from time import strftime, time
import pandas as pd
from statistics import mode
import requests
import mysql.connector as mysql
from flask_bcrypt import Bcrypt 
from dotenv import load_dotenv
import os
from ..databases import db as dbconn

if load_dotenv("/Users/lniel/OneDrive - Department of Education/Coding/personal website/.env"):
    pass
else:
    if load_dotenv("/var/www/.env"):
        pass
    else:
        print("Dotenv not found")

app = Flask(__name__)
bcrypt = Bcrypt(app)
app.secret_key = os.getenv('SECRET_KEY')
db = dbconn.db
cursor = db.cursor()

def login(username, password, accesscode):
    sql = "SELECT * FROM `dbmaster`.User WHERE accesscode = %s AND username = %s"
    u = (accesscode, username)
    cursor.execute(sql, u)
    myresult = cursor.fetchall()
    db.commit()

    if bcrypt.check_password_hash(str(myresult[0][2]), str(password)):
        if myresult[0][3] == "1":
            session['logged_in'] = True
            session['lvl'] = 1
            session['username'] = username
            return redirect(url_for('studentpage'))
        if myresult[0][3] == "2":
            session['logged_in'] = True
            session['lvl'] = 2
            session['username'] = username
            return redirect(url_for('teacherpage'))
        if myresult[0][3] == "3":
            session['logged_in'] = True
            session['lvl'] = 3
            session['username'] = username
            return redirect(url_for('adminpage'))
    else:
        # If incorrect stay on the password page
        return render_template("mainfiles/login.html")