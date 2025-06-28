from flask import Flask, request, jsonify
from datetime import datetime
import openai
import os
import json

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

openai.api_key = os.getenv("OPENAI_API_KEY")

# For demo: store last parsed items in memory (replace with DB for production)
last_parsed_items = []

def parse_receipt_with_gpt(image_path):
    with open(image_path, "rb") as image_file:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts items and prices from receipts."},
                {"role": "user", "content": "Please extract all items and prices from this receipt and return as JSON array of {item, price}."}
            ],
            files=[{"name": "receipt.jpg", "data": image_file.read()}],
        )
    content = response.choices[0].message.content
    items = json.loads(content)
    return items

@app.route('/upload', methods=['POST'])
def upload():
    global last_parsed_items
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = datetime.now().strftime('%Y%m%d%H%M%S') + '_' + file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        items = parse_receipt_with_gpt(filepath)
        last_parsed_items = items  # save for splitting
        return jsonify({'items': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/split', methods=['POST'])
def split_bill():
    global last_parsed_items
    data = request.get_json()
    if not data or 'people' not in data:
        return jsonify({'error': 'Missing "people" parameter'}), 400

    try:
        people = int(data['people'])
        if people <= 0:
            raise ValueError()
    except:
        return jsonify({'error': '"people" must be a positive integer'}), 400

    if not last_parsed_items:
        return jsonify({'error': 'No receipt items found. Upload a receipt first.'}), 400

    total = sum(item.get('price', 0) for item in last_parsed_items)
    per_person = round(total / people, 2)

    return jsonify({
        'total': round(total, 2),
        'people': people,
        'per_person': per_person
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
