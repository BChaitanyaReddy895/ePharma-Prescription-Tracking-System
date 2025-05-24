CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Doctor', 'Patient', 'Pharmacy')),
    name TEXT NOT NULL,
    email TEXT,
    zip_code TEXT
);

CREATE TABLE IF NOT EXISTS Medicines (
    medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    side_effects TEXT,
    price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS Prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER,
    patient_id INTEGER,
    medicine_id INTEGER,
    symptoms TEXT,
    dosage TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    prescription_date DATE NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES Users(user_id),
    FOREIGN KEY (patient_id) REFERENCES Users(user_id),
    FOREIGN KEY (medicine_id) REFERENCES Medicines(medicine_id)
);

CREATE TABLE IF NOT EXISTS Orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER,
    pharmacy_id INTEGER,
    patient_id INTEGER,
    status TEXT NOT NULL CHECK(status IN ('Pending', 'Fulfilled', 'Cancelled')),
    order_date DATE NOT NULL,
    FOREIGN KEY (prescription_id) REFERENCES Prescriptions(prescription_id),
    FOREIGN KEY (pharmacy_id) REFERENCES Users(user_id),
    FOREIGN KEY (patient_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS MedicalRecords (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    allergies TEXT,
    FOREIGN KEY (patient_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS PharmacyStock (
    stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pharmacy_id INTEGER,
    medicine_id INTEGER,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (pharmacy_id) REFERENCES Users(user_id),
    FOREIGN KEY (medicine_id) REFERENCES Medicines(medicine_id)
);