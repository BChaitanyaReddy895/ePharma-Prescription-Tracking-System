from flask import Flask, request, jsonify, send_file
import sqlite3
from datetime import datetime

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys = ON;')
    with open('database_schema.sql', 'r') as f:
        cursor.executescript(f.read())
    # Insert sample data if tables are empty
    cursor.execute('SELECT COUNT(*) FROM Users')
    if cursor.fetchone()[0] == 0:
        cursor.executescript('''
            INSERT INTO Users (username, password, role, name, email, zip_code)
            VALUES ('doc1', 'pass123', 'Doctor', 'Dr. Smith', 'doc1@example.com', '12345'),
                   ('pat1', 'pass123', 'Patient', 'John Doe', 'pat1@example.com', '12345'),
                   ('pharm1', 'pass123', 'Pharmacy', 'City Pharmacy', 'pharm1@example.com', '12345');
            INSERT INTO Medicines (name, description, side_effects, price)
            VALUES ('Paracetamol', 'Pain reliever', 'Nausea, rash', 5.99),
                   ('Ibuprofen', 'Anti-inflammatory', 'Stomach pain', 7.99);
            INSERT INTO PharmacyStock (pharmacy_id, medicine_id, quantity)
            VALUES (3, 1, 100), (3, 2, 50);
            INSERT INTO MedicalRecords (patient_id, allergies)
            VALUES (2, 'Penicillin');
        ''')
    conn.commit()
    conn.close()

@app.route('/')
def serve_index():
    return send_file('index.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('SELECT user_id, role, name FROM Users WHERE username = ? AND password = ? AND role = ?',
                   (data['username'], data['password'], data['role']))
    user = cursor.fetchone()
    conn.close()
    if user:
        return jsonify({'status': 'success', 'user_id': user[0], 'role': user[1], 'name': user[2]})
    return jsonify({'status': 'error', 'message': 'Invalid credentials'})

@app.route('/prescribe', methods=['POST'])
def prescribe():
    data = request.json
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    # Check for allergies
    cursor.execute('SELECT allergies FROM MedicalRecords WHERE patient_id = ?', (data['patient_id'],))
    allergies = cursor.fetchone()
    if allergies and allergies[0]:
        cursor.execute('SELECT side_effects FROM Medicines WHERE medicine_id = ?', (data['medicine_id'],))
        side_effects = cursor.fetchone()
        if side_effects and any(allergy.lower() in side_effects[0].lower() for allergy in allergies[0].split(',')):
            conn.close()
            return jsonify({'status': 'error', 'message': 'Allergy conflict detected'})
    cursor.execute('INSERT INTO Prescriptions (doctor_id, patient_id, medicine_id, symptoms, dosage, duration_days, prescription_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (data['doctor_id'], data['patient_id'], data['medicine_id'], data['symptoms'], data['dosage'], data['duration'], datetime.now().strftime('%Y-%m-%d')))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/prescriptions/<patient_id>', methods=['GET'])
def get_prescriptions(patient_id):
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('SELECT p.prescription_id, m.name, p.symptoms, p.dosage, p.duration_days, p.prescription_date, m.side_effects FROM Prescriptions p JOIN Medicines m ON p.medicine_id = m.medicine_id WHERE p.patient_id = ?', (patient_id,))
    prescriptions = cursor.fetchall()
    conn.close()
    return jsonify([{'id': p[0], 'medicine': p[1], 'symptoms': p[2], 'dosage': p[3], 'duration': p[4], 'date': p[5], 'side_effects': p[6]} for p in prescriptions])

@app.route('/order', methods=['POST'])
def place_order():
    data = request.json
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    # Check stock
    cursor.execute('SELECT quantity FROM PharmacyStock WHERE pharmacy_id = ? AND medicine_id = (SELECT medicine_id FROM Prescriptions WHERE prescription_id = ?)', 
                   (data['pharmacy_id'], data['prescription_id']))
    stock = cursor.fetchone()
    if not stock or stock[0] <= 0:
        # Suggest alternative pharmacies
        cursor.execute('SELECT u.user_id, u.name FROM PharmacyStock ps JOIN Users u ON ps.pharmacy_id = u.user_id WHERE ps.medicine_id = (SELECT medicine_id FROM Prescriptions WHERE prescription_id = ?) AND ps.quantity > 0', 
                       (data['prescription_id'],))
        alternatives = cursor.fetchall()
        conn.close()
        if alternatives:
            return jsonify({'status': 'error', 'message': 'Out of stock', 'alternatives': [{'id': a[0], 'name': a[1]} for a in alternatives]})
        return jsonify({'status': 'error', 'message': 'Out of stock, no alternatives available'})
    cursor.execute('INSERT INTO Orders (prescription_id, pharmacy_id, patient_id, status, order_date) VALUES (?, ?, ?, ?, ?)',
                   (data['prescription_id'], data['pharmacy_id'], data['patient_id'], 'Pending', datetime.now().strftime('%Y-%m-%d')))
    cursor.execute('UPDATE PharmacyStock SET quantity = quantity - 1 WHERE pharmacy_id = ? AND medicine_id = (SELECT medicine_id FROM Prescriptions WHERE prescription_id = ?)',
                   (data['pharmacy_id'], data['prescription_id']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/orders/<pharmacy_id>', methods=['GET'])
def get_orders(pharmacy_id):
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('SELECT o.order_id, p.prescription_id, m.name, o.status FROM Orders o JOIN Prescriptions p ON o.prescription_id = p.prescription_id JOIN Medicines m ON p.medicine_id = m.medicine_id WHERE o.pharmacy_id = ?', (pharmacy_id,))
    orders = cursor.fetchall()
    conn.close()
    return jsonify([{'order_id': o[0], 'prescription_id': o[1], 'medicine': o[2], 'status': o[3]} for o in orders])

@app.route('/update_order', methods=['POST'])
def update_order():
    data = request.json
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE Orders SET status = ? WHERE order_id = ?', (data['status'], data['order_id']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/most_prescribed', methods=['GET'])
def most_prescribed():
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('SELECT m.name, COUNT(p.medicine_id) as count FROM Prescriptions p JOIN Medicines m ON p.medicine_id = m.medicine_id GROUP BY m.medicine_id ORDER BY count DESC LIMIT 5')
    results = cursor.fetchall()
    conn.close()
    return jsonify([{'medicine': r[0], 'count': r[1]} for r in results])

@app.route('/low_stock/<pharmacy_id>', methods=['GET'])
def low_stock(pharmacy_id):
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('SELECT m.name, s.quantity FROM PharmacyStock s JOIN Medicines m ON s.medicine_id = m.medicine_id WHERE s.pharmacy_id = ? AND s.quantity < 10', (pharmacy_id,))
    results = cursor.fetchall()
    conn.close()
    return jsonify([{'medicine': r[0], 'quantity': r[1]} for r in results])

@app.route('/nearby_pharmacies/<zip_code>/<medicine_id>', methods=['GET'])
def nearby_pharmacies(zip_code, medicine_id):
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('SELECT u.user_id, u.name FROM Users u JOIN PharmacyStock ps ON u.user_id = ps.pharmacy_id WHERE u.zip_code = ? AND ps.medicine_id = ? AND ps.quantity > 0', (zip_code, medicine_id))
    pharmacies = cursor.fetchall()
    conn.close()
    return jsonify([{'id': p[0], 'name': p[1]} for p in pharmacies])

@app.route('/refill_reminders/<patient_id>', methods=['GET'])
def refill_reminders(patient_id):
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('SELECT p.prescription_id, m.name FROM Prescriptions p JOIN Medicines m ON p.medicine_id = m.medicine_id WHERE p.patient_id = ? AND DATE(p.prescription_date, "+" || p.duration_days || " days") <= DATE("now")', (patient_id,))
    results = cursor.fetchall()
    conn.close()
    return jsonify([{'prescription_id': r[0], 'medicine': r[1]} for r in results])

@app.route('/update_stock', methods=['POST'])
def update_stock():
    data = request.json
    conn = sqlite3.connect('epharma.db')
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO PharmacyStock (pharmacy_id, medicine_id, quantity) VALUES (?, ?, ?)',
                   (data['pharmacy_id'], data['medicine_id'], data['quantity']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)