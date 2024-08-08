from __main__ import app
from flask import Flask, redirect, render_template, request, session, url_for
from flask_bootstrap import Bootstrap
from flask_bcrypt import Bcrypt

import pandas as pd, requests, mysql.connector as mysql, os
from dotenv import load_dotenv
from statistics import mode
from time import strftime, time

from backend.meandersuiteprerelease import teacherfinder, msw, login as logms, register
from backend.meandersuiteprerelease.studenthub_backend import page2 as p2, studentnotifications as sn, studentpage as spage, studentplanner as sp
from backend.meandersuiteprerelease.teacherhub_backend import page1 as p1, pb4lpointsys as pb4l, qcaatracker as qcaa, teachernotifications as tn, teacherpage as tpage, teacherplanner as tp
from backend.meandersuiteprerelease.adminhub_backend import adminpage as ap
from backend.specialksopalprerelease import *
from backend.databases import db as mdb
#########################################################################################################################################################################################################################
# MEANDER SUITE ROUTES
#########################################################################################################################################################################################################################
# ______________________________________________________________________________________________________________________________________________________________
# The following code is for the main welcome website
# ______________________________________________________________________________________________________________________________________________________________
@app.route('/meandersuite')
def meandersuite():
    return render_template("meandersuiteprerelease/index.html")
# ------------------------------------------------------------
# Setting up a subpage for the teacher finder project page
# ------------------------------------------------------------
@app.route('/meandersuite/teacherfinder')
def teacherfinderdesc():
    return render_template("meandersuiteprerelease/mainfiles/teacherfinder.html")
# ------------------------------------------------------------
# Setting up a subpage for the student notification project page
# ------------------------------------------------------------
@app.route('/meandersuite/studentnotifications')
def studentnotificationsdesc():
    return render_template("meandersuiteprerelease/mainfiles/studentnotifications.html")
# ------------------------------------------------------------
# Setting up a subpage for the student planner project page
# ------------------------------------------------------------
@app.route('/meandersuite/studentplanner')
def studentplannerdesc():
    return render_template("meandersuiteprerelease/mainfiles/studentplanner.html")
# ------------------------------------------------------------
# Setting up a subpage for the teacher notifications project page
# ------------------------------------------------------------
@app.route('/meandersuite/teachernotifications')
def teachernotificationsdesc():
    return render_template("meandersuiteprerelease/mainfiles/teachernotifications.html")
# ------------------------------------------------------------
# Setting up a subpage for the msw project page
# ------------------------------------------------------------
@app.route('/meandersuite/msw')
def mswdesc():
    return render_template("meandersuiteprerelease/mainfiles/mswdesc.html")
# ------------------------------------------------------------
# Setting up a subpage for the pb4l points project page
# ------------------------------------------------------------
@app.route('/meandersuite/pb4lpoints')
def pb4lpointsysdesc():
    return render_template("meandersuiteprerelease/mainfiles/pb4lpointsysdesc.html")
# ------------------------------------------------------------
# Setting up a subpage for the qcaa tracker project page
# ------------------------------------------------------------
@app.route('/meandersuite/qcaatracker')
def qcaatrackerdesc():
    return render_template("meandersuiteprerelease/mainfiles/qcaatrackerdesc.html")
# ------------------------------------------------------------
# Setting up a subpage for the teacher planner project page
# ------------------------------------------------------------
@app.route('/meandersuite/personalplanner')
def personalplannerdesc():
    return render_template("meandersuiteprerelease/mainfiles/personalplannerdesc.html")
# ------------------------------------------------------------
# Setting up a subpage for the student timetable project page
# ------------------------------------------------------------
@app.route('/meandersuite/studenttimetable')
def studenttimetabledesc():
    return render_template("meandersuiteprerelease/mainfiles/studenttimetabledesc.html")
# ------------------------------------------------------------
# Setting up a subpage for the teacher timetable project page
# ------------------------------------------------------------
@app.route('/meandersuite/teachertimetable')
def teachertimetabledesc():
    return render_template("meandersuiteprerelease/mainfiles/teachertimetabledesc.html")
# ------------------------------------------------------------
# Setting up the teacher project page
# ------------------------------------------------------------
@app.route('/meandersuite/teacherprojects')
def teacherprojects():
    return render_template("meandersuiteprerelease/mainfiles/teacherprojects.html")
# ------------------------------------------------------------
# Setting up the student project page
# ------------------------------------------------------------
@app.route('/meandersuite/studentprojects')
def studentprojects():
    return render_template("meandersuiteprerelease/mainfiles/studentprojects.html")
@app.route('/meandersuite/documentation')
def documentation():
    return render_template("meandersuiteprerelease/mainfiles/documentation.html")


# ______________________________________________________________________________________________________________________________________________________________
# The security portion
# ______________________________________________________________________________________________________________________________________________________________
# ------------------------------------------------------------
# Setting up a subpage for the teacher content pack register page
# ------------------------------------------------------------
@app.route('/meandersuite/teachercontentpack')
def teachercontentpackdesc():
    if request.method == "POST":
        return
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/teachercontentpack.html")
# ------------------------------------------------------------
# Setting up a subpage for the student content pack register page
# ------------------------------------------------------------
@app.route('/meandersuite/studentcontentpack')
def studentcontentpackdesc():
    if request.method == "POST":
        return
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/studentcontentpack.html")
# ------------------------------------------------------------
# Setting up a subpage for the school content pack register page
# ------------------------------------------------------------
@app.route('/meandersuite/duluxepack')
def duluxepackdesc():
    if request.method == "POST":
        return
    if request.method == "GET":
        return render_template("meandersuiteprerelease/mainfiles/duluxepack.html")
# Setting up a subpage for the login page
# ------------------------------------------------------------ 
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
# The following code is for the StudentHub extension
# ______________________________________________________________________________________________________________________________________________________________
# /////////
# Setting up a root page for the StudentHub extension
# /////////
@app.route('/meandersuite/studenthub')
def studentpage():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/studentpage.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# The following code is for the StudentHub's Timetable change Notification extension
# ------------------------------------------------------------
@app.route('/meandersuite/studenthub/timetablechanges')
def studentnotifications():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/studenttimetable.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# The following code is for the StudentHub's Planner extension
# ------------------------------------------------------------
@app.route('/meandersuite/studenthub/planner')
def studentplanner():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/studentplanner.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# The following code is for the StudentHub's Teacher finder extension
# ------------------------------------------------------------
@app.route('/meandersuite/studenthub/teacherfinder')
def page2():
    if "logged_in" in session:
        if session["lvl"] == 1:
            if request.method == "POST":
                return render_template("meandersuiteprerelease/studentpagefiles/answer.html", value1=teacherfinder.findateacher(), val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
            if request.method == "GET":
                return render_template("meandersuiteprerelease/studentpagefiles/index.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])   
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))




# ______________________________________________________________________________________________________________________________________________________________
# The following code is for the TeacherHub extension
# ______________________________________________________________________________________________________________________________________________________________
# /////////
# Setting up a root page for the TeacherHub extension
# /////////
@app.route('/meandersuite/teacherhub')
def teacherpage():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/teacherpage.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# The following code is for the TeacherHub's Timetable change Notification extension
# ------------------------------------------------------------
@app.route('/meandersuite/teacherhub/timetablechanges')
def teachernotifications():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/teachertimetable.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# The following code is for the TeacherHub's Planner extension
# ------------------------------------------------------------
@app.route('/meandersuite/teacherhub/planner')
def teacherplanner():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/teacherplanner.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# The following code is for the TeacherHub's Teacher finder extension
# ------------------------------------------------------------
@app.route('/meandersuite/teacherhub/teacherfinder', methods=["GET", "POST"])
def page1():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return render_template("meandersuiteprerelease/teacherpagefiles/answer.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4], value1=teacherfinder.findateacher())
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/index.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))   
# ------------------------------------------------------------
# The following code is for the TeacherHub's Traffic light extension
# ------------------------------------------------------------
@app.route('/meandersuite/teacherhub/pb4lpointsys')
def pb4lpointsys():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return 
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/pb4lpointsys.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))
# ------------------------------------------------------------
# The following code is for the TeacherHub's Traffic light extension
# ------------------------------------------------------------
@app.route('/meandersuite/teacherhub/qcaatracker')
def qcaatracker():
    if "logged_in" in session:
        if session["lvl"] == 2:
            if request.method == "POST":
                return
            if request.method == "GET":
                return render_template("meandersuiteprerelease/teacherpagefiles/qcaatracker.html", val1=msw.TrafficLights()[0], val2=msw.TrafficLights()[1], val3=msw.TrafficLights()[2], val4=msw.TrafficLights()[3], val5=msw.TrafficLights()[4])
        else:
            return redirect(url_for('login'))
    else:
        return redirect(url_for('login'))


# ______________________________________________________________________________________________________________________________________________________________
# The following code is for the AdminHub extension
# ______________________________________________________________________________________________________________________________________________________________
# /////////
# Setting up a root page for the AdminHub extension
# /////////
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