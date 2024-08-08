from flask import Flask, redirect, render_template, request, session, url_for, jsonify
from flask_bootstrap import Bootstrap
from flask_bcrypt import Bcrypt

import os
from dotenv import load_dotenv

from backend.main import login as logni
from backend.databases import db as mdb


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

db = mdb.db
cursor = db.cursor()

import meandersuiteroutes
import specialksroutes

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
    
if __name__ == '__main__':
    app.run(debug=True)