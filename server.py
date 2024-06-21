from flask import Flask, render_template, request, jsonify

app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/submit_data', methods=['POST'])
def submit_data():
    data = request.json  # Get JSON data from request
    print('Received data:', data)

    # Process the data as needed (e.g., store it in a database)

    return jsonify({'message': 'Data received successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True)
