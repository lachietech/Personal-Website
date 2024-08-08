from app import app
from flask import Flask, redirect, render_template, request, session, url_for
from flask_bootstrap import Bootstrap
from flask_bcrypt import Bcrypt
from backend.main import login as logni
#########################################################################################################################################################################################################################
# SPECIAL KS OPAL ROUTES
#########################################################################################################################################################################################################################
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

#########################################################################################################################################################################################################################
# SPECIAL KS OPAL DASHBOARD ROUTES
#########################################################################################################################################################################################################################
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