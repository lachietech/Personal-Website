###################################################################################################################################################################################################
# MAIN SETUP AND DEFINITION OF MAIN VARIABLES #####################################################################################################################################################
###################################################################################################################################################################################################

# All Flask Imports
from flask import Flask, redirect, render_template, request, session, url_for, jsonify
from flask_bcrypt import Bcrypt

# All General Imports
import os, pandas as pd, requests, mysql.connector as mysql
from dotenv import load_dotenv
from statistics import mode
from time import strftime, time

# All Backend Code Imports
from backend.main import login as logni
from backend.databases import db as mdb
from backend.meandersuiteprerelease import login as logms

# Finding The .env Variables File
if load_dotenv("/Users/lniel/OneDrive/BUSINESS/Coding/personal website/.env"):
    pass
else:
    if load_dotenv("/var/www/.env"):
        pass
    else:
        print("Dotenv not found") # Check if this is in the error message in the server log.

# Setting Up Flask
app = Flask(__name__)
bcrypt = Bcrypt(app)
app.secret_key = os.getenv('SECRET_KEY')

# Preparing Database Connection
db = mdb.db
cursor = db.cursor()

###################################################################################################################################################################################################
# MAIN WEBSITE ROUTES #############################################################################################################################################################################
###################################################################################################################################################################################################

@app.route('/', methods=['GET'])
def index():
    return render_template("main/index.html")


###################################################################################################################################################################################################
# MEANDER SUITE ROUTES ############################################################################################################################################################################
###################################################################################################################################################################################################
# This is a complex program that has many of its own pages and subpages. They will be noted in the comment headers. Pay attention to the types of pages.
# ______________________________________________________________________________________________________________________________________________________________
# Main Welcome Website
# ______________________________________________________________________________________________________________________________________________________________

# Main Website Route
@app.route('/meandersuite')
def meandersuite():
    return render_template("meandersuiteprerelease/mainfiles/index.html")

# ------------------------------------------------------------
# Setting up subpages for the main website
# ------------------------------------------------------------

@app.route('/meandersuite/msw')
def mswdesc():
    return render_template("meandersuiteprerelease/mainfiles/mswdesc.html")

@app.route('/meandersuite/documentation')
def documentation():
    return render_template("meandersuiteprerelease/mainfiles/documentation.html")

# ______________________________________________________________________________________________________________________________________________________________
# Authentication Pages
# ______________________________________________________________________________________________________________________________________________________________
@app.route('/meandersuite/register', methods=["GET", "POST"])
def register():
    if request.method == "POST":
        password = str(request.form.get("password"))
        username = str(request.form.get("username"))
        email = str(request.form.get("email"))
        first_name = str(request.form.get("first_name"))
        last_name = str(request.form.get("last_name"))
        location = str(request.form.get("location"))

        return logms.register(username, password, email, first_name, last_name, location)
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/register.html")
    
@app.route('/meandersuite/login', methods=["GET", "POST"])
def login():
    if request.method == "POST":
        password = str(request.form.get("password"))
        username = str(request.form.get("username"))
        return logms.login(username, password)
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/login.html")

# ______________________________________________________________________________________________________________________________________________________________
# Suite Pages
# ______________________________________________________________________________________________________________________________________________________________

# Setting up a root page for the StudentHub extension
@app.route('/meandersuite/suite')
def suite():
    if request.method == "GET":
        return render_template("meandersuiteprerelease/suitefiles/index.html") # , val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4]
    else:
        return redirect(url_for('login'))
        
###################################################################################################################################################################################################
# RUN LINE ########################################################################################################################################################################################
###################################################################################################################################################################################################

if __name__ == '__main__':
    app.run(debug=True)