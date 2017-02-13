from flask import Flask, request, send_from_directory
app = Flask(__name__)

@app.route("/")
def hello():
  return send_from_directory('./', 'index.html')

@app.route("/main.js")
def main_js():
  return send_from_directory('./', 'main.js')

if __name__ == "__main__":
  app.run()
