let currentUser = null;

function login() {
    const role = document.getElementById('role').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            currentUser = { id: data.user_id, role: data.role, name: data.name };
            document.getElementById('login').classList.add('hidden');
            if (role === 'Doctor') {
                document.getElementById('doctorDashboard').classList.remove('hidden');
                document.getElementById('doctorName').textContent = data.name;
            } else if (role === 'Patient') {
                document.getElementById('patientDashboard').classList.remove('hidden');
                document.getElementById('patientName').textContent = data.name;
            } else if (role === 'Pharmacy') {
                document.getElementById('pharmacyDashboard').classList.remove('hidden');
                document.getElementById('pharmacyName').textContent = data.name;
            }
        } else {
            alert('Invalid credentials');
        }
    })
    .catch(error => console.error('Error:', error));
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
            alert('Prescription created successfully');
            document.getElementById('prescribeForm').reset();
        } else {
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

function fetchPrescriptions() {
    fetch(`/prescriptions/${currentUser.id}`)
    .then(response => response.json())
    .then(data => {
        const prescriptionsDiv = document.getElementById('prescriptions');
        prescriptionsDiv.innerHTML = '<h4 class="text-lg font-semibold">Prescriptions</h4>';
        if (data.length === 0) {
            prescriptionsDiv.innerHTML += '<p>No prescriptions found.</p>';
            return;
        }
        data.forEach(p => {
            prescriptionsDiv.innerHTML += `
                <div class="border p-4 mb-2 rounded bg-gray-50">
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
            alert('Order placed successfully');
            document.getElementById('orderForm').reset();
        } else {
            if (data.alternatives) {
                alert(`Out of stock. Try these pharmacies: ${data.alternatives.map(a => a.name).join(', ')}`);
            } else {
                alert(data.message);
            }
        }
    })
    .catch(error => console.error('Error:', error));
}

function fetchOrders() {
    fetch(`/orders/${currentUser.id}`)
    .then(response => response.json())
    .then(data => {
        const ordersDiv = document.getElementById('pendingOrders');
        ordersDiv.innerHTML = '<h4 class="text-lg font-semibold">Orders</h4>';
        if (data.length === 0) {
            ordersDiv.innerHTML += '<p>No orders found.</p>';
            return;
        }
        data.forEach(o => {
            ordersDiv.innerHTML += `
                <div class="border p-4 mb-2 rounded bg-gray-50">
                    <p><strong>Order ID:</strong> ${o.order_id}</p>
                    <p><strong>Prescription ID:</strong> ${o.prescription_id}</p>
                    <p><strong>Medicine:</strong> ${o.medicine}</p>
                    <p><strong>Status:</strong> ${o.status}</p>
                    <button onclick="updateOrderStatus(${o.order_id}, 'Fulfilled')" class="bg-green-600 text-white p-1 rounded hover:bg-green-700">Mark Fulfilled</button>
                    <button onclick="updateOrderStatus(${o.order_id}, 'Cancelled')" class="bg-red-600 text-white p-1 rounded hover:bg-red-700">Cancel</button>
                </div>
            `;
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
            alert(`Order ${status} successfully`);
            fetchOrders();
        } else {
            alert('Error updating order');
        }
    })
    .catch(error => console.error('Error:', error));
}

function fetchMostPrescribed() {
    fetch('/most_prescribed')
    .then(response => response.json())
    .then(data => {
        const analyticsDiv = document.getElementById('analytics');
        analyticsDiv.innerHTML = '<h4 class="text-lg font-semibold">Most Prescribed Medicines</h4>';
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
        lowStockDiv.innerHTML = '<h4 class="text-lg font-semibold">Low Stock Alerts</h4>';
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
    fetch(`/nearby_pharmacies/${zipCode}/${medicineId}`)
    .then(response => response.json())
    .then(data => {
        const pharmaciesDiv = document.getElementById('nearbyPharmacies');
        pharmaciesDiv.innerHTML = '<h4 class="text-lg font-semibold">Nearby Pharmacies</h4>';
        if (data.length === 0) {
            pharmaciesDiv.innerHTML += '<p>No pharmacies found with stock.</p>';
            return;
        }
        data.forEach(p => {
            pharmaciesDiv.innerHTML += `<p>ID: ${p.id}, Name: ${p.name}</p>`;
        });
    })
    .catch(error => console.error('Error:', error));
}

function fetchRefillReminders() {
    fetch(`/refill_reminders/${currentUser.id}`)
    .then(response => response.json())
    .then(data => {
        const remindersDiv = document.getElementById('refillReminders');
        remindersDiv.innerHTML = '<h4 class="text-lg font-semibold">Refill Reminders</h4>';
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

function updateStock() {
    const data = {
        pharmacy_id: currentUser.id,
        medicine_id: document.getElementById('medicineIdStock').value,
        quantity: document.getElementById('quantity').value
    };

    fetch('/update_stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Stock updated successfully');
            document.getElementById('stockForm').reset();
        } else {
            alert('Error updating stock');
        }
    })
    .catch(error => console.error('Error:', error));
}