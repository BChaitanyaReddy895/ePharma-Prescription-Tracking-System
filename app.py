import sqlite3
from flask import Flask, request, jsonify, render_template, send_file, g
from datetime import datetime, timedelta
import os

app = Flask(__name__)

def get_db_connection():
    if 'db' not in g:
        # Use an environment variable for the database path, default to 'epharma.db'
        db_path = os.getenv('SQLITE_DB_PATH', 'epharma.db')
        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row  # Allows fetching rows as dictionaries
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('INSERT INTO Users (username, password, role, name, email, zip_code) VALUES (?, ?, ?, ?, ?, ?)',
                       (data['username'], data['password'], data['role'], data['name'], data['email'], data['zip_code']))
        user_id = cursor.lastrowid
        if data['role'] == 'Patient':
            cursor.execute('INSERT INTO MedicalRecords (patient_id, allergies) VALUES (?, ?)',
                           (user_id, data['allergies'] if data['allergies'] else 'None'))
        connection.commit()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        cursor.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    print(f"Login attempt: username={data['username']}, password={data['password']}, role={data['role']}")
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT user_id, role, name FROM Users WHERE username = ? AND password = ? AND role = ?',
                       (data['username'], data['password'], data['role']))
        user = cursor.fetchone()
        print(f"Query result: {user}")
        cursor.close()
        if user:
            return jsonify({'status': 'success', 'user_id': user['user_id'], 'role': user['role'], 'name': user['name']})
        return jsonify({'status': 'error', 'message': 'Invalid credentials'})
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/patients', methods=['GET'])
def get_patients():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT user_id, name FROM Users WHERE role = ?', ('Patient',))
        patients = cursor.fetchall()
        cursor.close()
        return jsonify([{'id': p['user_id'], 'name': p['name']} for p in patients])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/medicines', methods=['GET'])
def get_medicines():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT medicine_id, name, strength, manufacturer FROM Medicines')
        medicines = cursor.fetchall()
        cursor.close()
        return jsonify([{'id': m['medicine_id'], 'name': m['name'], 'strength': m['strength'], 'manufacturer': m['manufacturer']} for m in medicines])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/pharmacies', methods=['GET'])
def get_pharmacies():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT user_id, name FROM Users WHERE role = ?', ('Pharmacy',))
        pharmacies = cursor.fetchall()
        cursor.close()
        return jsonify([{'id': p['user_id'], 'name': p['name']} for p in pharmacies])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/zip_codes', methods=['GET'])
def get_zip_codes():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT DISTINCT zip_code FROM Users WHERE role = ? AND zip_code IS NOT NULL', ('Pharmacy',))
        zip_codes = cursor.fetchall()
        cursor.close()
        return jsonify([z['zip_code'] for z in zip_codes])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/prescribe', methods=['POST'])
def prescribe():
    data = request.json
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT user_id, role FROM Users WHERE user_id = ?', (data['patient_id'],))
        patient = cursor.fetchone()
        if not patient:
            return jsonify({'status': 'error', 'message': 'Patient ID does not exist'})
        if patient['role'] != 'Patient':
            return jsonify({'status': 'error', 'message': 'Selected user is not a Patient'})

        cursor.execute('SELECT medicine_id FROM Medicines WHERE medicine_id = ?', (data['medicine_id'],))
        medicine = cursor.fetchone()
        if not medicine:
            return jsonify({'status': 'error', 'message': 'Medicine ID does not exist'})

        cursor.execute('SELECT allergies FROM MedicalRecords WHERE patient_id = ?', (data['patient_id'],))
        allergies = cursor.fetchone()
        if allergies and allergies['allergies']:
            cursor.execute('SELECT side_effects FROM Medicines WHERE medicine_id = ?', (data['medicine_id'],))
            side_effects = cursor.fetchone()
            if side_effects and any(allergy.lower() in side_effects['side_effects'].lower() for allergy in allergies['allergies'].split(',')):
                return jsonify({'status': 'error', 'message': 'Allergy conflict detected'})

        cursor.execute('INSERT INTO Prescriptions (doctor_id, patient_id, medicine_id, symptoms, dosage, duration_days, prescription_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                       (data['doctor_id'], data['patient_id'], data['medicine_id'], data['symptoms'], data['dosage'], data['duration'], datetime.now().strftime('%Y-%m-%d')))
        connection.commit()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        cursor.close()

@app.route('/prescriptions/<int:patient_id>', methods=['GET'])
def get_prescriptions(patient_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT p.prescription_id, m.name, p.symptoms, p.dosage, p.duration_days, p.prescription_date, m.side_effects '
                       'FROM Prescriptions p JOIN Medicines m ON p.medicine_id = m.medicine_id WHERE p.patient_id = ?', (patient_id,))
        prescriptions = cursor.fetchall()
        cursor.close()
        return jsonify([{'id': p['prescription_id'], 'medicine': p['name'], 'symptoms': p['symptoms'], 'dosage': p['dosage'], 'duration': p['duration_days'], 'date': p['prescription_date'], 'side_effects': p['side_effects']} for p in prescriptions])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/order', methods=['POST'])
def place_order():
    data = request.json
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT medicine_id FROM Prescriptions WHERE prescription_id = ? AND patient_id = ?',
                       (data['prescription_id'], data['patient_id']))
        prescription = cursor.fetchone()
        if not prescription:
            cursor.close()
            return jsonify({'status': 'error', 'message': 'Invalid prescription ID'})
        medicine_id = prescription['medicine_id']
        cursor.execute('SELECT quantity FROM PharmacyStock WHERE pharmacy_id = ? AND medicine_id = ?',
                       (data['pharmacy_id'], medicine_id))
        stock = cursor.fetchone()
        if not stock or stock['quantity'] <= 0:
            cursor.execute('SELECT u.user_id, u.name FROM PharmacyStock ps JOIN Users u ON ps.pharmacy_id = u.user_id '
                           'WHERE ps.medicine_id = ? AND ps.quantity > 0 AND u.role = ?', (medicine_id, 'Pharmacy'))
            alternatives = cursor.fetchall()
            cursor.close()
            return jsonify({'status': 'error', 'message': 'Out of stock at selected pharmacy', 'alternatives': [{'id': a['user_id'], 'name': a['name']} for a in alternatives]})
        cursor.execute('INSERT INTO Orders (prescription_id, pharmacy_id, patient_id, status, order_date) VALUES (?, ?, ?, ?, ?)',
                       (data['prescription_id'], data['pharmacy_id'], data['patient_id'], 'Pending', datetime.now().strftime('%Y-%m-%d')))
        cursor.execute('UPDATE PharmacyStock SET quantity = quantity - 1 WHERE pharmacy_id = ? AND medicine_id = ?',
                       (data['pharmacy_id'], medicine_id))
        connection.commit()
        cursor.close()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/orders/<int:pharmacy_id>', methods=['GET'])
def get_orders(pharmacy_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT o.order_id, o.prescription_id, m.name, o.status '
                       'FROM Orders o JOIN Prescriptions p ON o.prescription_id = p.prescription_id '
                       'JOIN Medicines m ON p.medicine_id = m.medicine_id WHERE o.pharmacy_id = ?', (pharmacy_id,))
        orders = cursor.fetchall()
        cursor.close()
        return jsonify([{'order_id': o['order_id'], 'prescription_id': o['prescription_id'], 'medicine': o['name'], 'status': o['status']} for o in orders])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/update_order', methods=['POST'])
def update_order():
    data = request.json
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('UPDATE Orders SET status = ? WHERE order_id = ?', (data['status'], data['order_id']))
        connection.commit()
        cursor.close()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/most_prescribed', methods=['GET'])
def most_prescribed():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT m.name, COUNT(*) as count FROM Prescriptions p JOIN Medicines m ON p.medicine_id = m.medicine_id '
                       'GROUP BY m.medicine_id, m.name ORDER BY count DESC LIMIT 5')
        data = cursor.fetchall()
        cursor.close()
        return jsonify([{'medicine': d['name'], 'count': d['count']} for d in data])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/low_stock/<int:pharmacy_id>', methods=['GET'])
def low_stock(pharmacy_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT m.name, ps.quantity FROM PharmacyStock ps JOIN Medicines m ON ps.medicine_id = m.medicine_id '
                       'WHERE ps.pharmacy_id = ? AND ps.quantity < 10', (pharmacy_id,))
        data = cursor.fetchall()
        cursor.close()
        return jsonify([{'medicine': d['name'], 'quantity': d['quantity']} for d in data])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/nearby_pharmacies/<zip_code>/<int:medicine_id>', methods=['GET'])
def nearby_pharmacies(zip_code, medicine_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT u.user_id, u.name FROM Users u JOIN PharmacyStock ps ON u.user_id = ps.pharmacy_id '
                       'WHERE u.role = ? AND u.zip_code = ? AND ps.medicine_id = ? AND ps.quantity > 0', ('Pharmacy', zip_code, medicine_id))
        pharmacies = cursor.fetchall()
        cursor.close()
        return jsonify([{'id': p['user_id'], 'name': p['name']} for p in pharmacies])
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/refill_reminders/<int:patient_id>', methods=['GET'])
def refill_reminders(patient_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT p.prescription_id, m.name, p.duration_days, p.prescription_date '
                       'FROM Prescriptions p JOIN Medicines m ON p.medicine_id = m.medicine_id WHERE p.patient_id = ?', (patient_id,))
        prescriptions = cursor.fetchall()
        reminders = []
        for p in prescriptions:
            end_date = datetime.strptime(p['prescription_date'], '%Y-%m-%d') + timedelta(days=p['duration_days'])
            if end_date.date() <= datetime.now().date():
                reminders.append({'prescription_id': p['prescription_id'], 'medicine': p['name']})
        cursor.close()
        return jsonify(reminders)
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/update_stock', methods=['POST'])
def update_stock():
    data = request.json
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        # Check if the medicine exists, if not, insert it with the new details
        cursor.execute('SELECT medicine_id FROM Medicines WHERE medicine_id = ?', (data['medicine_id'],))
        medicine = cursor.fetchone()
        if not medicine and data.get('new_tablet'):
            cursor.execute(
                'INSERT INTO Medicines (name, strength, manufacturer, side_effects) VALUES (?, ?, ?, ?)',
                (data['new_tablet']['name'], data['new_tablet']['strength'], data['new_tablet']['manufacturer'], 'None')
            )
            data['medicine_id'] = cursor.lastrowid

        # Update stock (SQLite equivalent of ON DUPLICATE KEY UPDATE)
        cursor.execute('SELECT quantity FROM PharmacyStock WHERE pharmacy_id = ? AND medicine_id = ?', (data['pharmacy_id'], data['medicine_id']))
        existing = cursor.fetchone()
        if existing:
            cursor.execute('UPDATE PharmacyStock SET quantity = quantity + ? WHERE pharmacy_id = ? AND medicine_id = ?',
                           (data['quantity'], data['pharmacy_id'], data['medicine_id']))
        else:
            cursor.execute('INSERT INTO PharmacyStock (pharmacy_id, medicine_id, quantity) VALUES (?, ?, ?)',
                           (data['pharmacy_id'], data['medicine_id'], data['quantity']))
        connection.commit()
        return jsonify({'status': 'success'})
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        cursor.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)))
