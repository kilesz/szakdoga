from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/main_page')
def main():
    return render_template('main_page.html')

@app.route('/datas')
def data():
    return render_template('weblap.html')

@app.route('/graphs')
def graph():
    return render_template('graphs.html')

@app.route('/locations')
def location():
    return render_template('locations.html')

@app.route('/proxy', methods=['POST'])
def proxy():
    data = request.json
    if not data or 'ip' not in data:
        return jsonify({"error": "IP parameter is missing"}), 400
    ip = data['ip']
    url = f'https://mazsola.iit.uni-miskolc.hu/~qgeroli5/fgsz/index.php?currentHost={ip}'
    try:
        response = requests.get(url, verify=False)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Request failed: {e}")
        return jsonify({"error": str(e)}), 500
    except ValueError as e:
        app.logger.error(f"JSON decode failed: {e}")
        return jsonify({"error": "Invalid JSON response"}), 500

if __name__ == '__main__':
    from waitress import serve
    serve(app, host="0.0.0.0", port=8080)