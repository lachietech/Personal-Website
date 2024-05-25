import mysql.connector as mysql, os
from dotenv import load_dotenv

if load_dotenv("/Users/lniel/OneDrive - Department of Education/Coding/personal website/.env"):
    print("Dotenv loaded")
    pass
else:
    if load_dotenv("/var/www/.env"):
        print("Dotenv loaded")
        pass
    else:
        print("Dotenv not found")

db = mysql.connect(host = os.getenv('HOST'), port = os.getenv('PORT'), user = "dbmasteruser", password = os.getenv('PASSWORD'))
cursor = db.cursor()
