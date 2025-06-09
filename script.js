// Save this as script.js - Frontend JavaScript with Authentication
const API_BASE_URL = 'http://localhost:3000/api';

// Authentication check on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthentication();
    loadCars();
});

async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/login';
            return;
        }
        
        // Update welcome message
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${data.user.full_name}!`;
        }
        
        console.log('User authenticated:', data.user);
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login';
    }
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                window.location.href = '/login';
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Network error during logout.');
        }
    }
}

// Handle authentication errors in API calls
async function handleAuthenticatedRequest(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        ...options
    };
    
    try {
        const response = await fetch(url, defaultOptions);
        
        if (response.status === 401) {
            alert('Your session has expired. Please login again.');
            window.location.href = '/login';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}

// Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to clicked nav button
    event.target.classList.add('active');
    
    // Load data for the selected section
    if (sectionName === 'cars') {
        loadCars();
    } else if (sectionName === 'customers') {
        loadCustomers();
    } else if (sectionName === 'rentals') {
        loadRentals();
        loadCustomersForSelect();
        loadCarsForSelect();
    }
}

// Car Management
function showAddCarForm() {
    document.getElementById('addCarForm').style.display = 'block';
}

function hideAddCarForm() {
    document.getElementById('addCarForm').style.display = 'none';
    document.getElementById('carForm').reset();
}

document.getElementById('carForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const carData = {
        brand: document.getElementById('carBrand').value,
        model: document.getElementById('carModel').value,
        year: parseInt(document.getElementById('carYear').value),
        color: document.getElementById('carColor').value,
        license_plate: document.getElementById('carLicense').value,
        daily_price: parseFloat(document.getElementById('carPrice').value)
    };
    
    try {
        const response = await handleAuthenticatedRequest(`${API_BASE_URL}/cars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(carData)
        });
        
        if (!response) return; // Authentication failed
        
        if (response.ok) {
            hideAddCarForm();
            loadCars();
            alert('Car added successfully!');
        } else {
            const errorData = await response.json();
            alert(errorData.error || 'Error adding car');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding car');
    }
});

async function loadCars() {
    try {
        const response = await handleAuthenticatedRequest(`${API_BASE_URL}/cars`);
        if (!response) return; // Authentication failed
        
        const cars = await response.json();
        
        const tbody = document.getElementById('carsTableBody');
        tbody.innerHTML = '';
        
        cars.forEach(car => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${car.id}</td>
                <td>${car.brand}</td>
                <td>${car.model}</td>
                <td>${car.year}</td>
                <td>${car.color}</td>
                <td>${car.license_plate}</td>
                <td>${car.daily_price}</td>
                <td><span class="status-${car.status}">${car.status}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteCar(${car.id})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading cars:', error);
    }
}

async function deleteCar(id) {
    if (confirm('Are you sure you want to delete this car?')) {
        try {
            const response = await handleAuthenticatedRequest(`${API_BASE_URL}/cars/${id}`, {
                method: 'DELETE'
            });
            
            if (!response) return; // Authentication failed
            
            if (response.ok) {
                loadCars();
                alert('Car deleted successfully!');
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Error deleting car');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting car');
        }
    }
}

// Customer Management
function showAddCustomerForm() {
    document.getElementById('addCustomerForm').style.display = 'block';
}

function hideAddCustomerForm() {
    document.getElementById('addCustomerForm').style.display = 'none';
    document.getElementById('customerForm').reset();
}

document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const customerData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        license_number: document.getElementById('customerLicense').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(customerData)
        });
        
        if (response.ok) {
            hideAddCustomerForm();
            loadCustomers();
            alert('Customer added successfully!');
        } else {
            alert('Error adding customer');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding customer');
    }
});

async function loadCustomers() {
    try {
        const response = await fetch(`${API_BASE_URL}/customers`);
        const customers = await response.json();
        
        const tbody = document.getElementById('customersTableBody');
        tbody.innerHTML = '';
        
        customers.forEach(customer => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>${customer.license_number}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${customer.id})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function deleteCustomer(id) {
    if (confirm('Are you sure you want to delete this customer?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadCustomers();
                alert('Customer deleted successfully!');
            } else {
                alert('Error deleting customer');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting customer');
        }
    }
}

// Rental Management
function showAddRentalForm() {
    document.getElementById('addRentalForm').style.display = 'block';
}

function hideAddRentalForm() {
    document.getElementById('addRentalForm').style.display = 'none';
    document.getElementById('rentalForm').reset();
}

async function loadCustomersForSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/customers`);
        const customers = await response.json();
        
        const select = document.getElementById('rentalCustomer');
        select.innerHTML = '<option value="">Select Customer</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function loadCarsForSelect() {
    try {
        const response = await fetch(`${API_BASE_URL}/cars/available`);
        const cars = await response.json();
        
        const select = document.getElementById('rentalCar');
        select.innerHTML = '<option value="">Select Car</option>';
        
        cars.forEach(car => {
            const option = document.createElement('option');
            option.value = car.id;
            option.textContent = `${car.brand} ${car.model} (${car.license_plate})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading cars:', error);
    }
}

document.getElementById('rentalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rentalData = {
        customer_id: parseInt(document.getElementById('rentalCustomer').value),
        car_id: parseInt(document.getElementById('rentalCar').value),
        start_date: document.getElementById('rentalStartDate').value,
        end_date: document.getElementById('rentalEndDate').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/rentals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rentalData)
        });
        
        if (response.ok) {
            hideAddRentalForm();
            loadRentals();
            loadCarsForSelect(); // Refresh available cars
            alert('Rental created successfully!');
        } else {
            alert('Error creating rental');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating rental');
    }
});

async function loadRentals() {
    try {
        const response = await fetch(`${API_BASE_URL}/rentals`);
        const rentals = await response.json();
        
        const tbody = document.getElementById('rentalsTableBody');
        tbody.innerHTML = '';
        
        rentals.forEach(rental => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${rental.id}</td>
                <td>${rental.customer_name}</td>
                <td>${rental.car_brand} ${rental.car_model}</td>
                <td>${new Date(rental.start_date).toLocaleDateString()}</td>
                <td>${new Date(rental.end_date).toLocaleDateString()}</td>
                <td>$${rental.total_cost}</td>
                <td><span class="status-${rental.status}">${rental.status}</span></td>
                <td>
                    ${rental.status === 'active' ? 
                        `<button class="btn btn-warning btn-sm" onclick="completeRental(${rental.id})">Complete</button>` : 
                        ''
                    }
                    <button class="btn btn-danger btn-sm" onclick="deleteRental(${rental.id})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading rentals:', error);
    }
}

async function completeRental(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/rentals/${id}/complete`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            loadRentals();
            loadCarsForSelect(); // Refresh available cars
            alert('Rental completed successfully!');
        } else {
            alert('Error completing rental');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error completing rental');
    }
}

async function deleteRental(id) {
    if (confirm('Are you sure you want to delete this rental?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/rentals/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadRentals();
                loadCarsForSelect(); // Refresh available cars
                alert('Rental deleted successfully!');
            } else {
                alert('Error deleting rental');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting rental');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadCars();
});