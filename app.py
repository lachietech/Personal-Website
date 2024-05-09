from flask import Flask, redirect, render_template, request, session, url_for
app = Flask(__name__)
blog_posts = {"malaysia-2023":"malaysia.html", "presidents-shield":"presidentsshield.html", "sponsor-announcement":"sponsorannouncement.html"}

@app.route('/')
def index():
    return render_template("main/index.html")

@app.route('/blog/<blogname>')
def blog(blogname):
    return render_template(str("main/blog/"+blog_posts[blogname]))


if __name__ == '__main__':
    app.run(debug=True)