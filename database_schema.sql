-- Create Users table
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Doctor', 'Patient', 'Pharmacy')),
    name TEXT NOT NULL,
    email TEXT,
    zip_code TEXT
);

-- Create Medicines table
CREATE TABLE Medicines (
    medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    strength TEXT,
    manufacturer TEXT,
    side_effects TEXT
);

-- Create MedicalRecords table
CREATE TABLE MedicalRecords (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    allergies TEXT,
    FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Create Prescriptions table
CREATE TABLE Prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    symptoms TEXT,
    dosage TEXT,
    duration_days INTEGER,
    prescription_date DATE,
    FOREIGN KEY (doctor_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES Medicines(medicine_id) ON DELETE CASCADE
);

-- Create Orders table
CREATE TABLE Orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER NOT NULL,
    pharmacy_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Fulfilled', 'Cancelled')),
    order_date DATE,
    FOREIGN KEY (prescription_id) REFERENCES Prescriptions(prescription_id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacy_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Create PharmacyStock table
CREATE TABLE PharmacyStock (
    pharmacy_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (pharmacy_id, medicine_id),
    FOREIGN KEY (pharmacy_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES Medicines(medicine_id) ON DELETE CASCADE
);

-- Insert sample data
INSERT INTO Users (username, password, role, name, email, zip_code) VALUES
('doc1', 'pass123', 'Doctor', 'Dr. Smith', 'doc1@example.com', '12345'),
('pat1', 'pass123', 'Patient', 'John Doe', 'pat1@example.com', '12345'),
('pharm1', 'pass123', 'Pharmacy', 'City Pharmacy', 'pharm1@example.com', '12345');

INSERT INTO Medicines (name, strength, manufacturer, side_effects) VALUES
('Paracetamol', '500 mg', 'Cipla', 'Nausea, rash'),
('Ibuprofen', '400 mg', 'Abbott', 'Stomach pain, heartburn'),
('Amoxicillin', '250 mg', 'Ranbaxy', 'Diarrhea, allergic reactions'),
('Amlodipine', '5 mg', 'Pfizer', 'Dizziness, swelling in ankles'),
('Metformin', '500 mg', 'Merck', 'Nausea, stomach upset');

INSERT INTO MedicalRecords (patient_id, allergies) VALUES
(2, 'Penicillin');

INSERT INTO PharmacyStock (pharmacy_id, medicine_id, quantity) VALUES
(3, 1, 100),
(3, 2, 50),
(3, 3, 30),
(3, 4, 20),
(3, 5, 40);
