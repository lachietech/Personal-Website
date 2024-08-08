import mysql.connector as mysql, os
from dotenv import load_dotenv

if load_dotenv("/Users/lniel/OneDrive - Department of Education/Coding/personal website/.env"):
    pass
else:
    if load_dotenv("/var/www/.env"):
        pass
    else:
        print("Dotenv not found")

db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
cursor = db.cursor()

blog_posts = [
    {'title': 'MY LAST EVER PRESIDENTS SHIELD', 'image': "./static/main/img/Nice whole team photo.jpg", 'tag':'presidents-shield', 'filename': 'presidentsshield.html'},
    {'title': 'MALAYSIA 2023', 'image': "./static/main/img/malaysia post.jpg", 'tag':'malaysia-2023', 'filename': 'malaysia.html'},
]
