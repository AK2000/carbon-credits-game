from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient

app = Flask(__name__, static_url_path='', static_folder='static')
client = MongoClient()
game_responses = client.enery_survey.game_responses

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/submit_data', methods=['POST'])
def submit_data():
    data = request.json  # Get JSON data from request
    inserted_id = game_responses.insert_one(data).inserted_id
    print('Inserted data:', inserted_id)
    return jsonify({'message': 'Data received successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True)
