let currentUser = null;

// Attach event listeners for buttons
document.addEventListener('DOMContentLoaded', () => {
    // Toggle between login and signup forms
    document.getElementById('showSignupLink').addEventListener('click', (e) => {
        e.preventDefault();
        showSignup();
    });
    document.getElementById('showLoginLink').addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });
    document.getElementById('signupRole').addEventListener('change', function() {
        document.getElementById('signupAllergies').disabled = this.value !== 'Patient';
    });

    // Login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            login();
        });
    } else {
        console.error('Login button not found in the DOM');
    }

    // Doctor Dashboard: Most Prescribed Medicines
    const mostPrescribedButton = document.getElementById('mostPrescribedButton');
    if (mostPrescribedButton) {
        mostPrescribedButton.addEventListener('click', fetchMostPrescribed);
    }

    // Patient Dashboard: View Prescriptions
    const viewPrescriptionsButton = document.getElementById('viewPrescriptionsButton');
    if (viewPrescriptionsButton) {
        viewPrescriptionsButton.addEventListener('click', fetchPrescriptions);
    }

    // Patient Dashboard: Find Pharmacies
    const findPharmaciesButton = document.getElementById('findPharmaciesButton');
    if (findPharmaciesButton) {
        findPharmaciesButton.addEventListener('click', findPharmacies);
    }

    // Patient Dashboard: Check Reminders
    const checkRemindersButton = document.getElementById('checkRemindersButton');
    if (checkRemindersButton) {
        checkRemindersButton.addEventListener('click', fetchRefillReminders);
    }

    // Pharmacy Dashboard: View Orders
    const viewOrdersButton = document.getElementById('viewOrdersButton');
    if (viewOrdersButton) {
        viewOrdersButton.addEventListener('click', fetchOrders);
    }

    // Pharmacy Dashboard: Check Low Stock
    const checkLowStockButton = document.getElementById('checkLowStockButton');
    if (checkLowStockButton) {
        checkLowStockButton.addEventListener('click', fetchLowStock);
    }
});

function showSignup() {
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('signupSection').classList.remove('d-none');
}

function showLogin() {
    document.getElementById('signupSection').classList.add('d-none');
    document.getElementById('loginSection').classList.remove('d-none');
}

function signup() {
    const data = {
        role: document.getElementById('signupRole').value,
        username: document.getElementById('signupUsername').value,
        password: document.getElementById('signupPassword').value,
        name: document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        zip_code: document.getElementById('signupZipCode').value,
        allergies: document.getElementById('signupAllergies').value
    };

    console.log('Signup request data:', data);

    fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Signup response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Signup response data:', data);
        if (data.status === 'success') {
            showToast('Registration successful! Please login.', 'success');
            showLogin();
            document.getElementById('signupForm').reset();
        } else {
            showToast(data.message || 'Signup failed. Please try again.', 'danger');
        }
    })
    .catch(error => {
        console.error('Signup error:', error);
        showToast('Error connecting to the server. Please try again later.', 'danger');
    });
}

function login() {
    const role = document.getElementById('loginRole').value;
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    console.log('Login request data:', { username, password, role });

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    })
    .then(response => {
        console.log('Login response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Login response data:', data);
        if (data.status === 'success') {
            currentUser = { id: data.user_id, role: data.role, name: data.name };
            document.getElementById('loginSection').classList.add('d-none');
            if (role === 'Doctor') {
                document.getElementById('doctorDashboard').classList.remove('d-none');
                document.getElementById('doctorName').textContent = data.name;
                fetchPatients();
                fetchMedicines();
            } else if (role === 'Patient') {
                document.getElementById('patientDashboard').classList.remove('d-none');
                document.getElementById('patientName').textContent = data.name;
                fetchPrescriptions();
                fetchPharmacies();
                fetchZipCodes();
                fetchMedicinesForPharmacy();
            } else if (role === 'Pharmacy') {
                document.getElementById('pharmacyDashboard').classList.remove('d-none');
                document.getElementById('pharmacyName').textContent = data.name;
                fetchMedicinesForStock();
            }
            showToast('Login successful!', 'success');
        } else {
            showToast('Invalid credentials. Please try again.', 'danger');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showToast('Error connecting to the server. Please try again later.', 'danger');
    });
}

function fetchPatients() {
    fetch('/patients')
    .then(response => response.json())
    .then(data => {
        const patientSelect = document.getElementById('patientId');
        patientSelect.innerHTML = '<option value="" disabled selected>Select a Patient</option>';
        if (data.length === 0) {
            patientSelect.innerHTML += '<option value="" disabled>No patients available</option>';
            return;
        }
        data.forEach(patient => {
            patientSelect.innerHTML += `<option value="${patient.id}">${patient.name} (ID: ${patient.id})</option>`;
        });
    })
    .catch(error => console.error('Error fetching patients:', error));
}

function fetchMedicines() {
    fetch('/medicines')
    .then(response => response.json())
    .then(data => {
        const medicineSelect = document.getElementById('medicineId');
        medicineSelect.innerHTML = '<option value="" disabled selected>Select a Medicine</option>';
        if (data.length === 0) {
            medicineSelect.innerHTML += '<option value="" disabled>No medicines available</option>';
            return;
        }
        data.forEach(medicine => {
            medicineSelect.innerHTML += `<option value="${medicine.id}">${medicine.name} (ID: ${medicine.id})</option>`;
        });
    })
    .catch(error => console.error('Error fetching medicines:', error));
}

function fetchMedicinesForPharmacy() {
    fetch('/medicines')
    .then(response => response.json())
    .then(data => {
        const medicineSelect = document.getElementById('medicineIdPharmacy');
        medicineSelect.innerHTML = '<option value="" disabled selected>Select Medicine</option>';
        if (data.length === 0) {
            medicineSelect.innerHTML += '<option value="" disabled>No medicines available</option>';
            return;
        }
        data.forEach(medicine => {
            medicineSelect.innerHTML += `<option value="${medicine.id}">${medicine.name} (ID: ${medicine.id})</option>`;
        });
    })
    .catch(error => console.error('Error fetching medicines for pharmacy:', error));
}

function fetchMedicinesForStock() {
    fetch('/medicines')
    .then(response => response.json())
    .then(data => {
        const medicineSelect = document.getElementById('medicineIdStock');
        medicineSelect.innerHTML = '<option value="" disabled selected>Select a Medicine</option>';
        medicineSelect.innerHTML += '<option value="new">Add New Tablet</option>';
        if (data.length === 0) {
            return;
        }
        data.forEach(medicine => {
            const details = [medicine.strength, medicine.manufacturer].filter(Boolean).join(', ');
            const displayText = details ? `${medicine.name} (${details})` : medicine.name;
            medicineSelect.innerHTML += `<option value="${medicine.id}">${displayText} (ID: ${medicine.id})</option>`;
        });
    })
    .catch(error => console.error('Error fetching medicines for stock:', error));
}

function fetchPharmacies() {
    fetch('/pharmacies')
    .then(response => response.json())
    .then(data => {
        const pharmacySelect = document.getElementById('pharmacyId');
        pharmacySelect.innerHTML = '<option value="" disabled selected>Select a Pharmacy</option>';
        if (data.length === 0) {
            pharmacySelect.innerHTML += '<option value="" disabled>No pharmacies available</option>';
            return;
        }
        data.forEach(pharmacy => {
            pharmacySelect.innerHTML += `<option value="${pharmacy.id}">${pharmacy.name} (ID: ${pharmacy.id})</option>`;
        });
    })
    .catch(error => console.error('Error fetching pharmacies:', error));
}

function fetchZipCodes() {
    fetch('/zip_codes')
    .then(response => response.json())
    .then(data => {
        const zipSelect = document.getElementById('zipCode');
        zipSelect.innerHTML = '<option value="" disabled selected>Select Zip Code</option>';
        if (data.length === 0) {
            zipSelect.innerHTML += '<option value="" disabled>No zip codes available</option>';
            return;
        }
        data.forEach(zip => {
            zipSelect.innerHTML += `<option value="${zip}">${zip}</option>`;
        });
    })
    .catch(error => console.error('Error fetching zip codes:', error));
}

function prescribe() {
    const data = {
        doctor_id: currentUser.id,
        patient_id: document.getElementById('patientId').value,
        medicine_id: document.getElementById('medicineId').value,
        symptoms: document.getElementById('symptoms').value,
        dosage: document.getElementById('dosage').value,
        duration: document.getElementById('duration').value
    };

    fetch('/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Prescription created successfully', 'success');
            document.getElementById('prescribeForm').reset();
        } else {
            showToast(data.message || 'Error creating prescription', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error connecting to the server', 'danger');
    });
}

function fetchPrescriptions() {
    fetch(`/prescriptions/${currentUser.id}`)
    .then(response => response.json())
    .then(data => {
        const prescriptionsDiv = document.getElementById('prescriptions');
        prescriptionsDiv.innerHTML = '<h4 class="h4 fw-semibold">Prescriptions</h4>';
        if (data.length === 0) {
            prescriptionsDiv.innerHTML += '<p>No prescriptions found.</p>';
        } else {
            data.forEach(p => {
                prescriptionsDiv.innerHTML += `
                    <div class="border p-3 mb-2 rounded bg-light">
                        <p><strong>Prescription ID:</strong> ${p.id}</p>
                        <p><strong>Medicine:</strong> ${p.medicine}</p>
                        <p><strong>Symptoms:</strong> ${p.symptoms || 'N/A'}</p>
                        <p><strong>Dosage:</strong> ${p.dosage}</p>
                        <p><strong>Duration:</strong> ${p.duration} days</p>
                        <p><strong>Date:</strong> ${p.date}</p>
                        <p><strong>Side Effects:</strong> ${p.side_effects || 'None'}</p>
                    </div>
                `;
            });
        }

        const prescriptionSelect = document.getElementById('prescriptionId');
        prescriptionSelect.innerHTML = '<option value="" disabled selected>Select a Prescription</option>';
        if (data.length === 0) {
            prescriptionSelect.innerHTML += '<option value="" disabled>No prescriptions available</option>';
        } else {
            data.forEach(p => {
                prescriptionSelect.innerHTML += `<option value="${p.id}">${p.medicine} (ID: ${p.id}, Date: ${p.date})</option>`;
            });
        }
    })
    .catch(error => console.error('Error:', error));
}

function placeOrder() {
    const data = {
        prescription_id: document.getElementById('prescriptionId').value,
        pharmacy_id: document.getElementById('pharmacyId').value,
        patient_id: currentUser.id
    };

    fetch('/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast('Order placed successfully', 'success');
            document.getElementById('orderForm').reset();
        } else {
            if (data.alternatives) {
                showToast(`Out of stock. Try these pharmacies: ${data.alternatives.map(a => a.name).join(', ')}`, 'warning');
            } else {
                showToast(data.message || 'Error placing order', 'danger');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error connecting to the server', 'danger');
    });
}

function fetchOrders() {
    fetch(`/orders/${currentUser.id}`)
    .then(response => response.json())
    .then(data => {
        const ordersDiv = document.getElementById('pendingOrders');
        ordersDiv.innerHTML = '<h4 class="h4 fw-semibold">Orders</h4>';
        if (data.length === 0) {
            ordersDiv.innerHTML += '<p>No orders found.</p>';
            return;
        }
        data.forEach(o => {
            ordersDiv.innerHTML += `
                <div class="border p-3 mb-2 rounded bg-light">
                    <p><strong>Order ID:</strong> ${o.order_id}</p>
                    <p><strong>Prescription ID:</strong> ${o.prescription_id}</p>
                    <p><strong>Medicine:</strong> ${o.medicine}</p>
                    <p><strong>Status:</strong> ${o.status}</p>
                    <button class="btn btn-success btn-sm me-2" data-order-id="${o.order_id}" data-status="Fulfilled">Mark Fulfilled</button>
                    <button class="btn btn-danger btn-sm" data-order-id="${o.order_id}" data-status="Cancelled">Cancel</button>
                </div>
            `;
        });

        // Add event listeners to the dynamically created buttons
        document.querySelectorAll('#pendingOrders button').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                const status = e.target.getAttribute('data-status');
                updateOrderStatus(orderId, status);
            });
        });
    })
    .catch(error => console.error('Error:', error));
}

function updateOrderStatus(orderId, status) {
    fetch('/update_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(`Order ${status} successfully`, 'success');
            fetchOrders();
        } else {
            showToast('Error updating order', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error connecting to the server', 'danger');
    });
}

function fetchMostPrescribed() {
    fetch('/most_prescribed')
    .then(response => response.json())
    .then(data => {
        const analyticsDiv = document.getElementById('analytics');
        analyticsDiv.innerHTML = '<h4 class="h4 fw-semibold">Most Prescribed Medicines</h4>';
        if (data.length === 0) {
            analyticsDiv.innerHTML += '<p>No data available.</p>';
            return;
        }
        data.forEach(d => {
            analyticsDiv.innerHTML += `<p>${d.medicine}: ${d.count} prescriptions</p>`;
        });
    })
    .catch(error => console.error('Error:', error));
}

function fetchLowStock() {
    fetch(`/low_stock/${currentUser.id}`)
    .then(response => response.json())
    .then(data => {
        const lowStockDiv = document.getElementById('lowStock');
        lowStockDiv.innerHTML = '<h4 class="h4 fw-semibold">Low Stock Alerts</h4>';
        if (data.length === 0) {
            lowStockDiv.innerHTML += '<p>No low stock items.</p>';
            return;
        }
        data.forEach(d => {
            lowStockDiv.innerHTML += `<p>${d.medicine}: ${d.quantity} units</p>`;
        });
    })
    .catch(error => console.error('Error:', error));
}

function findPharmacies() {
    const zipCode = document.getElementById('zipCode').value;
    const medicineId = document.getElementById('medicineIdPharmacy').value;
    if (!zipCode || !medicineId) {
        showToast('Please select both a zip code and a medicine.', 'warning');
        return;
    }
    fetch(`/nearby_pharmacies/${zipCode}/${medicineId}`)
    .then(response => response.json())
    .then(data => {
        const pharmaciesDiv = document.getElementById('nearbyPharmacies');
        pharmaciesDiv.innerHTML = '<h4 class="h4 fw-semibold">Nearby Pharmacies</h4>';
        if (data.length === 0) {
            pharmaciesDiv.innerHTML += '<p>No pharmacies found with stock.</p>';
            return;
        }
        data.forEach(p => {
            pharmaciesDiv.innerHTML += `<p>ID: ${p.id}, Name: ${p.name}</p>`;
        });
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error connecting to the server', 'danger');
    });
}

function fetchRefillReminders() {
    fetch(`/refill_reminders/${currentUser.id}`)
    .then(response => response.json())
    .then(data => {
        const remindersDiv = document.getElementById('refillReminders');
        remindersDiv.innerHTML = '<h4 class="h4 fw-semibold">Refill Reminders</h4>';
        if (data.length === 0) {
            remindersDiv.innerHTML += '<p>No refills due.</p>';
            return;
        }
        data.forEach(r => {
            remindersDiv.innerHTML += `<p>Prescription ID: ${r.prescription_id}, Medicine: ${r.medicine}</p>`;
        });
    })
    .catch(error => console.error('Error:', error));
}

function toggleNewTabletFields() {
    const medicineSelect = document.getElementById('medicineIdStock');
    const newTabletFields = document.getElementById('newTabletFields');
    const newTabletInputs = [
        document.getElementById('newTabletName'),
        document.getElementById('newTabletStrength'),
        document.getElementById('newTabletManufacturer')
    ];

    if (medicineSelect.value === 'new') {
        newTabletFields.classList.remove('d-none');
        newTabletInputs.forEach(input => {
            input.disabled = false;
            input.required = true;
        });
    } else {
        newTabletFields.classList.add('d-none');
        newTabletInputs.forEach(input => {
            input.disabled = true;
            input.required = false;
            input.value = '';
        });
    }
}

function updateStock() {
    const medicineId = document.getElementById('medicineIdStock').value;
    const quantity = document.getElementById('quantity').value;
    const confirmationDiv = document.getElementById('stockConfirmation');

    if (!medicineId || !quantity) {
        confirmationDiv.innerHTML = '<p class="text-danger">Please select a medicine and enter a quantity.</p>';
        return;
    }

    const data = {
        pharmacy_id: currentUser.id,
        medicine_id: medicineId,
        quantity: quantity
    };

    if (medicineId === 'new') {
        const newTabletName = document.getElementById('newTabletName').value
