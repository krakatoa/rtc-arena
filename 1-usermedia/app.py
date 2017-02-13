from flask import Flask, request, send_from_directory
app = Flask(__name__)

@app.route("/")
def hello():
  return send_from_directory('./', 'index.html')

if __name__ == "__main__":
  app.run()
