from flask import Flask, render_template, request, jsonify

try:
    from pymongo import MongoClient
    client = MongoClient()
    game_responses = client.enery_survey.game_responses
    mongo_enabled = True
except:
    mongo_enabled= False

app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/submit_data', methods=['POST'])
def submit_data():
    data = request.json  # Get JSON data from request

    if mongo_enabled: # For development without database
        if("jobs_completed" in data and "userID" in data):
            inserted_id = game_responses.insert_one(data).inserted_id
            print("Data inserted!")
            return jsonify({'message': 'Data stored successfully'}), 200

        return jsonify({'message': 'Bad Request'}), 400
    return jsonify({'message': 'Data received successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True)
