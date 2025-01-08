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
from backend.meandersuiteprerelease import teacherfinder, msw, login as logms, register
from backend.meandersuiteprerelease.studenthub_backend import page2 as p2, studentnotifications as sn, studentpage as spage, studentplanner as sp
from backend.meandersuiteprerelease.teacherhub_backend import page1 as p1, pb4lpointsys as pb4l, qcaatracker as qcaa, teachernotifications as tn, teacherpage as tpage, teacherplanner as tp
from backend.meandersuiteprerelease.adminhub_backend import adminpage as ap
from backend.specialksopalprerelease import *
from backend.databases import db as md

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
    return render_template("main/index.html", posts=mdb.blog_posts)

@app.route('/blog/<blogname>', methods=['GET'])
def blog(blogname):
    for post in mdb.blog_posts:
        if post["tag"] == blogname:
            return render_template(str("main/blog/"+post["filename"]))
    return url_for('index')

@app.route('/clienthub', methods=['GET', "POST"])
def nilogin():
    if request.method == "POST":
        password = str(request.form.get("password"))
        username = str(request.form.get("username"))
        return logni.login(username, password)
    if request.method == "GET":
        return render_template("main/login.html")

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
    return render_template("meandersuiteprerelease/index.html")

# ------------------------------------------------------------
# Setting up subpages for the main website
# ------------------------------------------------------------

@app.route('/meandersuite/teacherfinder')
def teacherfinderdesc():
    return render_template("meandersuiteprerelease/mainfiles/teacherfinder.html")

@app.route('/meandersuite/studentnotifications')
def studentnotificationsdesc():
    return render_template("meandersuiteprerelease/mainfiles/studentnotifications.html")

@app.route('/meandersuite/studentplanner')
def studentplannerdesc():
    return render_template("meandersuiteprerelease/mainfiles/studentplanner.html")

@app.route('/meandersuite/teachernotifications')
def teachernotificationsdesc():
    return render_template("meandersuiteprerelease/mainfiles/teachernotifications.html")

@app.route('/meandersuite/msw')
def mswdesc():
    return render_template("meandersuiteprerelease/mainfiles/mswdesc.html")

@app.route('/meandersuite/pb4lpoints')
def pb4lpointsysdesc():
    return render_template("meandersuiteprerelease/mainfiles/pb4lpointsysdesc.html")

@app.route('/meandersuite/qcaatracker')
def qcaatrackerdesc():
    return render_template("meandersuiteprerelease/mainfiles/qcaatrackerdesc.html")

@app.route('/meandersuite/personalplanner')
def personalplannerdesc():
    return render_template("meandersuiteprerelease/mainfiles/personalplannerdesc.html")

@app.route('/meandersuite/studenttimetable')
def studenttimetabledesc():
    return render_template("meandersuiteprerelease/mainfiles/studenttimetabledesc.html")

@app.route('/meandersuite/teachertimetable')
def teachertimetabledesc():
    return render_template("meandersuiteprerelease/mainfiles/teachertimetabledesc.html")

@app.route('/meandersuite/teacherprojects')
def teacherprojects():
    return render_template("meandersuiteprerelease/mainfiles/teacherprojects.html")

@app.route('/meandersuite/studentprojects')
def studentprojects():
    return render_template("meandersuiteprerelease/mainfiles/studentprojects.html")

@app.route('/meandersuite/documentation')
def documentation():
    return render_template("meandersuiteprerelease/mainfiles/documentation.html")

# ______________________________________________________________________________________________________________________________________________________________
# Authentication Pages
# ______________________________________________________________________________________________________________________________________________________________

@app.route('/meandersuite/teachercontentpack')
def teachercontentpackdesc():
    if request.method == "POST":
        return
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/teachercontentpack.html")

@app.route('/meandersuite/studentcontentpack')
def studentcontentpackdesc():
    if request.method == "POST":
        return
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/studentcontentpack.html")

@app.route('/meandersuite/duluxepack')
def duluxepackdesc():
    if request.method == "POST":
        return
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/duluxepack.html")

@app.route('/meandersuite/login', methods=["GET", "POST"])
def login():
    if request.method == "POST":
        password = str(request.form.get("password"))
        username = str(request.form.get("username"))
        accesscode = str(request.form.get("accesscode"))
        return logms.login(username, password, accesscode)
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/login.html")

# ______________________________________________________________________________________________________________________________________________________________
# StudentHub
# ______________________________________________________________________________________________________________________________________________________________

# Setting up a root page for the StudentHub extension
@app.route('/meandersuite/studenthub')
def studentpage():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/studentpage.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

# ------------------------------------------------------------
# StudentHub's Subpages and applications
# ------------------------------------------------------------
@app.route('/meandersuite/studenthub/timetablechanges')
def studentnotifications():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/studenttimetable.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

@app.route('/meandersuite/studenthub/planner')
def studentplanner():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/studentplanner.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

@app.route('/meandersuite/studenthub/teacherfinder')
def page2():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return render_template("meandersuiteprerelease/studentpagefiles/answer.html", 
                                       value1=teacherfinder.findateacher(), val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], 
                                       val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/index.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])   
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

# ______________________________________________________________________________________________________________________________________________________________
# TeacherHub
# ______________________________________________________________________________________________________________________________________________________________

# Setting up a root page for the TeacherHub extension
@app.route('/meandersuite/teacherhub')
def teacherpage():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/teacherpage.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# TeacherHub's Subpages and Applications
# ------------------------------------------------------------
@app.route('/meandersuite/teacherhub/timetablechanges')
def teachernotifications():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/teachertimetable.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

@app.route('/meandersuite/teacherhub/planner')
def teacherplanner():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/teacherplanner.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

@app.route('/meandersuite/teacherhub/teacherfinder', methods=["GET", "POST"])
def page1():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return render_template("meandersuiteprerelease/teacherpagefiles/answer.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], 
                                       val5=msw.TrafficLights()[4], value1=teacherfinder.findateacher())
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/index.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))   

@app.route('/meandersuite/teacherhub/pb4lpointsys')
def pb4lpointsys():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return 
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/pb4lpointsys.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))

@app.route('/meandersuite/teacherhub/qcaatracker')
def qcaatracker():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/qcaatracker.html", 
                                       val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))


# ______________________________________________________________________________________________________________________________________________________________
# AdminHub 
# ______________________________________________________________________________________________________________________________________________________________

# Setting up a root page for the AdminHub extension
@app.route('/meandersuite/adminpage')
def adminpage():
    if "logged_in" in session:
        if session["lvl"] == 3:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/adminpagefiles/adminpage.html",)
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))


###################################################################################################################################################################################################
# SPECIAL KS OPAL ROUTES ##########################################################################################################################################################################
###################################################################################################################################################################################################

# ______________________________________________________________________________________________________________________________________________________________
# Main Website  
# ______________________________________________________________________________________________________________________________________________________________

@app.route('/specialksopal')
def specialksopal():
    return render_template("specialksopalprerelease/index.html")

@app.route('/specialksopal/sales')
def specialksopalsales():
    return render_template("specialksopalprerelease/sales.html")

@app.route('/specialksopal/auctions')
def specialksopalauctions():
    return render_template("specialksopalprerelease/auctions.html")

@app.route('/specialksopal/login')
def specialksopallogin():
    return render_template("specialksopalprerelease/login.html")

# ______________________________________________________________________________________________________________________________________________________________
# Admin Dashboard 
# ______________________________________________________________________________________________________________________________________________________________

products = []

@app.route('/specialksopal/dashboard', methods=['GET','POST'])
def speckdashboard():
    if session["lvl"] == 1:
        return render_template('main/dashboards/specialksopal/dashboard.html', total_products=len(products), new_products=0, sales=0)

@app.route('/specialksopal/dashboard/products', methods=['GET','POST'])
def speckproducts():
    if session["lvl"] == 1:
        return render_template('main/dashboards/specialksopal/products.html', total_products=len(products), new_products=0, sales=0)

@app.route('/specialksopal/dashboard/auctions', methods=['GET','POST'])
def speckauctions():
    if session["lvl"] == 1:
        return render_template('main/dashboards/specialksopal/auctions.html', total_products=len(products), new_products=0, sales=0)
    
@app.route('/specialksopal/dashboard/customers', methods=['GET','POST'])
def speckcustomers():
    if session["lvl"] == 1:
        return render_template('main/dashboards/specialksopal/customers.html', total_products=len(products), new_products=0, sales=0)

@app.route('/specialksopal/dashboard/register', methods=['GET','POST'])
def speckregister():
    if session["lvl"] == 1:
        if request.method == "POST":
            password = str(request.form.get("password"))
            username = str(request.form.get("username"))
            logni.register(username, password, 1)
            return render_template('main/dashboards/specialksopal/register.html', total_products=len(products), new_products=0, sales=0)
        if request.method == "GET":
            return render_template('main/dashboards/specialksopal/register.html', total_products=len(products), new_products=0, sales=0)
        
###################################################################################################################################################################################################
# RUN LINE ########################################################################################################################################################################################
###################################################################################################################################################################################################

if __name__ == '__main__':
    app.run(debug=True)