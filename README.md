# Coastline · Car Rental Management

[Open the booking demo](https://7awwad.github.io/DBMS/) · [Browse the staff dashboard source](./index.html)

A self-drive rental project by **Mohammed Jawwad Nagarmat**. The public Coastline demo lets you compare cars by total trip price, review a reservation, and cancel it later. Demo prices are in Indian rupees. Reservations are stored in your browser for this demo.

### Try the booking flow

1. Choose pick-up and return dates and select **Find available cars**.
2. Review a vehicle’s daily rate, rental length, and total. Confirm to get a booking reference.
3. Under **My bookings**, cancel a reservation to make the car available again. A return date can be another booking’s pick-up date.

### Run the Express and SQLite project locally

With Node.js and npm installed, run these commands from the repository root:

```sh
npm install
npm start
```

Open [the local dashboard](http://localhost:3000/dashboard). The original app manages cars, customers, and rentals in SQLite. The separate [public demo](./docs/index.html) uses sample inventory and browser storage. No payments are collected.
