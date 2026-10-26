import os
import re

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model_random_forest.joblib')
VECTORIZER_PATH = os.path.join(BASE_DIR, 'tfidf_vectorizer.joblib')

# Load model and vectorizer from the same folder as this script
model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

app = Flask(__name__, template_folder=os.path.join(BASE_DIR, 'templates'))
CORS(app)


def preprocess_text(text):
    # Example cleaning: lowercase, remove non-alphabetic characters
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/predict', methods=['POST'])
def predict():
    try:
        if request.is_json:
            data = request.get_json(silent=True)
        else:
            data = request.form.to_dict()

        if not isinstance(data, dict):
            data = {}

        input_text = data.get('text')
        if not isinstance(input_text, str) or not input_text.strip():
            error_msg = 'Missing text parameter'
            if request.is_json:
                return jsonify({'error': error_msg}), 400
            return render_template('index.html', prediction_text='Please enter some text before checking.')

        processed_text = preprocess_text(input_text)
        transformed_text = vectorizer.transform([processed_text])
        prediction = model.predict(transformed_text)
        prediction_value = int(prediction[0])

        result = {
            'original_text': input_text,
            'processed_text': processed_text,
            'is_bullying': bool(prediction_value),
            'prediction': prediction_value
        }

        if request.is_json:
            return jsonify(result)

        label = 'Bullying detected' if prediction_value else 'No bullying detected'
        return render_template('index.html', prediction_text=f'{label} - {result["processed_text"]}')

    except Exception as e:
        if request.is_json:
            return jsonify({'error': str(e)}), 500
        return render_template('index.html', prediction_text='An error occurred while checking the text.')


if __name__ == '__main__':
    try:
        from waitress import serve
        serve(app, host='0.0.0.0', port=8080)
    except ImportError:
        app.run(host='0.0.0.0', port=8080, debug=False)
