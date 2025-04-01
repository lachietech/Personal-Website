###################################################################################################################################################################################################
# MAIN SETUP AND DEFINITION OF MAIN VARIABLES #####################################################################################################################################################
###################################################################################################################################################################################################

# Flask Imports
from flask import Flask, redirect, render_template, request, session, url_for, jsonify
from flask_bcrypt import Bcrypt

# General Imports
import os, pandas as pd, requests, mysql.connector as mysql
from dotenv import load_dotenv
from statistics import mode
from time import strftime, time

# MS Backend Code Imports
from backend.meandersuiteprerelease import login as logms
from backend.meandersuiteprerelease import msw

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
db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
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
        locationl = str(request.form.get("location-l"))
        locations = str(request.form.get("location-s"))
        locationc = str(request.form.get("location-c"))

        return logms.register(username, password, email, first_name, last_name, locationl, locations, locationc)
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
        if session["logged_in"]:
            result = msw.run()
            return render_template("meandersuiteprerelease/suitefiles/index.html", val1 = result[0], val2 = result[1], val3 = result[2], val4 = result[3], val5 = result[4], val6 = result[5], val7 = result[6], val8 = result[7], val9 = result[8], val10 = result[9], val11 = result[10])
        else:
            return redirect(url_for("login"))
            
        
###################################################################################################################################################################################################
# RUN LINE ########################################################################################################################################################################################
###################################################################################################################################################################################################

if __name__ == '__main__':
    app.run(debug=True)