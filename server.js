// server.js - Updated with Authentication
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.static(__dirname));

// Session configuration
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './'
    }),
    secret: 'car-rental-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Database setup
const db = new sqlite3.Database('car_rental.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table (NEW)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Cars table
    db.run(`
        CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER NOT NULL,
            color TEXT NOT NULL,
            license_plate TEXT UNIQUE NOT NULL,
            daily_price DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'available' CHECK(status IN ('available', 'rented')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Customers table  
    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            license_number TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Rentals table
    db.run(`
        CREATE TABLE IF NOT EXISTS rentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            car_id INTEGER NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_cost DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (car_id) REFERENCES cars (id)
        )
    `);

    // Insert sample data
    insertSampleData();
}

function insertSampleData() {
    // Check if data already exists
    db.get("SELECT COUNT(*) as count FROM cars", (err, row) => {
        if (!err && row.count === 0) {
            // Insert sample cars
            const sampleCars = [
                ['Toyota', 'Camry', 2022, 'White', 'ABC123', 45.00],
                ['Honda', 'Civic', 2021, 'Blue', 'XYZ789', 40.00],
                ['Ford', 'Mustang', 2023, 'Red', 'MUS456', 75.00],
                ['Chevrolet', 'Cruze', 2020, 'Black', 'CHV234', 35.00]
            ];

            sampleCars.forEach(car => {
                db.run(
                    "INSERT INTO cars (brand, model, year, color, license_plate, daily_price) VALUES (?, ?, ?, ?, ?, ?)",
                    car
                );
            });

            // Insert sample customers
            const sampleCustomers = [
                ['John Doe', 'john@email.com', '123-456-7890', 'DL123456'],
                ['Jane Smith', 'jane@email.com', '098-765-4321', 'DL789012']
            ];

            sampleCustomers.forEach(customer => {
                db.run(
                    "INSERT INTO customers (name, email, phone, license_number) VALUES (?, ?, ?, ?)",
                    customer
                );
            });

            console.log('Sample data inserted');
        }
    });

    // Create default admin user
    db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (!err && row.count === 0) {
            try {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                db.run(
                    "INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)",
                    ['admin', 'admin@carrental.com', hashedPassword, 'System Administrator', 'admin'],
                    function(err) {
                        if (!err) {
                            console.log('Default admin user created: username=admin, password=admin123');
                        }
                    }
                );
            } catch (error) {
                console.error('Error creating admin user:', error);
            }
        }
    });
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

// Serve static files and pages
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', (req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.redirect('/login');
    }
});

// Authentication Routes
app.post('/api/register', async (req, res) => {
    const { username, email, password, full_name } = req.body;
    
    if (!username || !email || !password || !full_name) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    try {
        // Check if user already exists
        db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (row) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run(
                "INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)",
                [username, email, hashedPassword, full_name],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error creating user' });
                    }
                    
                    // Auto-login after registration
                    req.session.userId = this.lastID;
                    req.session.username = username;
                    req.session.fullName = full_name;
                    
                    res.json({ 
                        message: 'Registration successful',
                        user: { id: this.lastID, username, full_name }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        try {
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // Create session
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.fullName = user.full_name;
            req.session.role = user.role;
            
            res.json({ 
                message: 'Login successful',
                user: { 
                    id: user.id, 
                    username: user.username, 
                    full_name: user.full_name,
                    role: user.role
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ 
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                full_name: req.session.fullName,
                role: req.session.role
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Protected API Routes (require authentication)

// Cars endpoints
app.get('/api/cars', requireAuth, (req, res) => {
    db.all("SELECT * FROM cars ORDER BY id DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/cars/available', requireAuth, (req, res) => {
    db.all("SELECT * FROM cars WHERE status = 'available' ORDER BY brand, model", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/cars', requireAuth, (req, res) => {
    const { brand, model, year, color, license_plate, daily_price } = req.body;
    
    db.run(
        "INSERT INTO cars (brand, model, year, color, license_plate, daily_price) VALUES (?, ?, ?, ?, ?, ?)",
        [brand, model, year, color, license_plate, daily_price],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID, message: 'Car added successfully' });
            }
        }
    );
});

app.delete('/api/cars/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM cars WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: 'Car deleted successfully' });
        }
    });
});

// Customers endpoints
app.get('/api/customers', requireAuth, (req, res) => {
    db.all("SELECT * FROM customers ORDER BY id DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/customers', requireAuth, (req, res) => {
    const { name, email, phone, license_number } = req.body;
    
    db.run(
        "INSERT INTO customers (name, email, phone, license_number) VALUES (?, ?, ?, ?)",
        [name, email, phone, license_number],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID, message: 'Customer added successfully' });
            }
        }
    );
});

app.delete('/api/customers/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM customers WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: 'Customer deleted successfully' });
        }
    });
});

// Rentals endpoints
app.get('/api/rentals', requireAuth, (req, res) => {
    const query = `
        SELECT r.*, c.name as customer_name, car.brand as car_brand, car.model as car_model
        FROM rentals r
        JOIN customers c ON r.customer_id = c.id
        JOIN cars car ON r.car_id = car.id
        ORDER BY r.id DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/rentals', requireAuth, (req, res) => {
    const { customer_id, car_id, start_date, end_date } = req.body;
    
    // Calculate total cost
    db.get("SELECT daily_price FROM cars WHERE id = ?", [car_id], (err, car) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const start = new Date(start_date);
        const end = new Date(end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const total_cost = days * car.daily_price;
        
        // Start transaction
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Insert rental
            db.run(
                "INSERT INTO rentals (customer_id, car_id, start_date, end_date, total_cost) VALUES (?, ?, ?, ?, ?)",
                [customer_id, car_id, start_date, end_date, total_cost],
                function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    // Update car status to rented
                    db.run("UPDATE cars SET status = 'rented' WHERE id = ?", [car_id], (err) => {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ error: err.message });
                        } else {
                            db.run("COMMIT");
                            res.json({ id: this.lastID, message: 'Rental created successfully' });
                        }
                    });
                }
            );
        });
    });
});

app.put('/api/rentals/:id/complete', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Get rental details first
    db.get("SELECT car_id FROM rentals WHERE id = ?", [id], (err, rental) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Start transaction
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Update rental status
            db.run("UPDATE rentals SET status = 'completed' WHERE id = ?", [id], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                // Update car status to available
                db.run("UPDATE cars SET status = 'available' WHERE id = ?", [rental.car_id], (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: err.message });
                    } else {
                        db.run("COMMIT");
                        res.json({ message: 'Rental completed successfully' });
                    }
                });
            });
        });
    });
});

app.delete('/api/rentals/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // Get rental details first
    db.get("SELECT car_id FROM rentals WHERE id = ?", [id], (err, rental) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Start transaction
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Delete rental
            db.run("DELETE FROM rentals WHERE id = ?", [id], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                // Update car status to available
                db.run("UPDATE cars SET status = 'available' WHERE id = ?", [rental.car_id], (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: err.message });
                    } else {
                        db.run("COMMIT");
                        res.json({ message: 'Rental deleted successfully' });
                    }
                });
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API endpoints available at http://localhost:3000/api/');
    console.log('Default admin login: username=admin, password=admin123');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});