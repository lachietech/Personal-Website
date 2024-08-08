from flask import Flask, redirect, render_template, request, session, url_for
import bcrypt
import os
from dotenv import load_dotenv
from ..databases import db as dbconn

if load_dotenv("/Users/lniel/OneDrive - Department of Education/Coding/personal website/.env"):
    pass
else:
    if load_dotenv("/var/www/.env"):
        pass
    else:
        print("Dotenv not found")

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')
db = dbconn.db
cursor = db.cursor()

def register(username, password, lvl):
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    cursor.execute("""SELECT * FROM NielsenInnovations.users WHERE username = %s""", (username,))
    if len(cursor.fetchall()) > 1:
        return
    else:
        cursor.execute("""INSERT INTO NielsenInnovations.users (username, password, lvl) VALUES (%s, %s, %s)""", (username, hashed_password, lvl))
        db.commit()

def login(username, password):
    cursor.execute("""SELECT * FROM NielsenInnovations.users WHERE username = %s""", (username,))
    user = cursor.fetchone()
    db.commit()
    if user:
        if bcrypt.checkpw(password.encode('utf-8'), user[2].encode('utf-8')):
            if user[3] == 1:
                session['logged_in'] = True
                session['lvl'] = 1
                session['username'] = username
                return redirect(url_for('speckdashboard'))
            if user[3] == 2:
                session['logged_in'] = True
                session['lvl'] = 2
                session['username'] = username
                return 
            if user[3] == 3:
                session['logged_in'] = True
                session['lvl'] = 3
                session['username'] = username
                return 
        else:
            return render_template("main/login.html")
    else:
        return render_template("main/login.html")

def test():
    username = input("Username: ")
    password = input("Password: ")
    register(username, password, 1)