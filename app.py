from flask import Flask, redirect, render_template, request, session, url_for
from flask_bootstrap import Bootstrap
from backend.main import postdb 
from backend.meandersuiteprerelease import *
from backend.specialksopalprerelease import *

app = Flask(__name__)

######
# MAIN ROUTES
######
@app.route('/')
def index():
    return render_template("main/index.html", posts=postdb.blog_posts)

@app.route('/blog/<blogname>')
def blog(blogname):
    for post in postdb.blog_posts:
        if post["tag"] == blogname:
            return render_template(str("main/blog/"+post["filename"]))
    return url_for('index')

######
# MEANDER SUITE ROUTES
######
@app.route('/meandersuite')
def meandersuite():
    return render_template("meandersuiteprerelease/temp.html")

######
# SPECIAL KS OPAL ROUTES
######
@app.route('/specialksopal')
def specialksopal():
    return render_template("specialksopalprerelease/index.html")

if __name__ == '__main__':
    app.run(debug=True)