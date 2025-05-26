-- Drop the database if it exists
DROP DATABASE IF EXISTS epharma;

-- Create the database
CREATE DATABASE epharma;
USE epharma;

-- Create Users table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(50) NOT NULL,
    role ENUM('Doctor', 'Patient', 'Pharmacy') NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    zip_code VARCHAR(10)
);

-- Create MedicalRecords table
CREATE TABLE MedicalRecords (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    allergies TEXT,
    FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Create Medicines table
CREATE TABLE Medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    strength VARCHAR(50),
    manufacturer VARCHAR(100),
    side_effects TEXT
);

-- Create Prescriptions table
CREATE TABLE Prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    medicine_id INT NOT NULL,
    symptoms TEXT,
    dosage VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL,
    prescription_date DATE NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES Medicines(medicine_id) ON DELETE CASCADE
);

-- Create PharmacyStock table
CREATE TABLE PharmacyStock (
    pharmacy_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    PRIMARY KEY (pharmacy_id, medicine_id),
    FOREIGN KEY (pharmacy_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES Medicines(medicine_id) ON DELETE CASCADE
);

-- Create Orders table
CREATE TABLE Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    pharmacy_id INT NOT NULL,
    patient_id INT NOT NULL,
    status ENUM('Pending', 'Fulfilled', 'Cancelled') NOT NULL,
    order_date DATE NOT NULL,
    FOREIGN KEY (prescription_id) REFERENCES Prescriptions(prescription_id) ON DELETE CASCADE,
    FOREIGN KEY (pharmacy_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Insert sample data into Users
INSERT INTO Users (username, password, role, name, email, zip_code) VALUES
('doc1', 'pass123', 'Doctor', 'Dr. Smith', 'smith@example.com', '12345'),
('pat1', 'pass123', 'Patient', 'John Doe', 'john@example.com', '12345'),
('pharm1', 'pass123', 'Pharmacy', 'City Pharmacy', 'pharm@example.com', '12345');

-- Insert sample data into MedicalRecords
INSERT INTO MedicalRecords (patient_id, allergies) VALUES
(2, 'Pollen');

-- Insert sample data into Medicines
INSERT INTO Medicines (name, strength, manufacturer, side_effects) VALUES
('Paracetamol', '500mg', 'Generic Labs', 'None'),
('Ibuprofen', '200mg', 'PainRelief Co', 'Nausea');

-- Insert sample data into Prescriptions (for Refill Reminders testing)
INSERT INTO Prescriptions (doctor_id, patient_id, medicine_id, symptoms, dosage, duration_days, prescription_date) VALUES
(1, 2, 1, 'Fever', '1 tablet daily', 5, '2025-05-20'),  -- Ends 2025-05-25 (needs refill)
(1, 2, 2, 'Headache', '1 tablet twice daily', 10, '2025-05-20'); -- Ends 2025-05-30 (no refill needed)

-- Insert sample data into PharmacyStock
INSERT INTO PharmacyStock (pharmacy_id, medicine_id, quantity) VALUES
(5, 1, 100),
(5, 2, 50);
