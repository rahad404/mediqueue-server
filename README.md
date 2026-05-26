# MediQueue – Tutor Booking System (Server API)

### **Programming Hero | Batch-13 | Assignment-9 | CAT_02**
* **Project Name:** MediQueue – Tutor Booking System (Backend)
* **Server Live API:** [https://mediqueue-server-two.vercel.app/](https://mediqueue-server-two.vercel.app/)
* **Server GitHub Repository:** [https://github.com/rahad404/mediqueue-server](https://github.com/rahad404/mediqueue-server)
* **Client Live Site:** [https://mediqueue-client-nine.vercel.app/](https://mediqueue-client-nine.vercel.app/)

---

## 📄 Project Description
The **MediQueue Server** is a fast, robust RESTful API backend built on Express.js and Node.js. It acts as the core database manager and transaction processor for the MediQueue application. It handles user profiles, stores and retrieves tutor details with highly customized regex searches, and securely manages atomic student booking pipelines utilizing native MongoDB operations.

---

## 🚀 Key Features

1. **Intelligent Regex Search Engine:**
   Processes complex search operations matching across multiple text fields (names, locations, subjects) and numerical limits (fees) with a single query parameter.
2. **Atomic Booking Transactions:**
   Enforces safe multi-document edits: inserts a booking record and concurrently decrements the total slots left on the tutor record atomically in MongoDB.
3. **Advanced JWT Token Verification:**
   Secures critical API routes (POST, PATCH, DELETE) using the `jose` JWT verification framework linked directly with Better Auth JWKS keys.
4. **Optimized Cors & Preflight Handlers:**
   Includes broad CORS support to communicate flawlessly with the client site across serverless, multi-domain environments.
5. **Vercel Serverless Ready:**
   Equipped with production-ready `vercel.json` configurations customized for clean routing and support for GET, POST, DELETE, PUT, PATCH, and OPTIONS preflights.

---

## 🛠️ Tech Stack

* **Runtime & Framework:** Node.js & Express.js
* **Database Driver:** MongoDB Native Driver (`mongodb` v7.2)
* **Security & Tokens:** JWT Signature Verification via `jose-cjs`
* **Environment Configuration:** `dotenv`
* **Deployment Platform:** Vercel Node.js Serverless Functions

---

## 🗺️ API Endpoints

All data operations are served under the base URL: `https://mediqueue-server-two.vercel.app` (or `http://localhost:5000` in development).

### 1. Tutors Endpoints
* `POST /tutors` — Add a new tutor profile. *(Requires JWT)*
* `GET /tutors` — Retrieve all tutors. Supports search queries:
  * `?search=<term>` — Filters by name, subject, mode, location, fee, etc.
  * `?startDate=<date>&endDate=<date>` — Filters by session start date ranges.
  * `?limit=<number>` — Limits results count.
* `GET /tutors/:id` — Retrieve a single tutor profile by ID. *(Requires JWT)*
* `PATCH /tutors/:id` — Edit an existing tutor profile. *(Requires JWT)*
* `DELETE /tutors/:id` — Delete a tutor profile from MongoDB. *(Requires JWT)*
* `GET /tutors/user/:email` — Fetch all tutor profiles added by a specific email. *(Requires JWT)*

### 2. Bookings Endpoints
* `POST /bookings` — Create a tutor session booking. Atomically decrements the tutor's available slots. *(Requires JWT)*
* `GET /bookings` — Fetch all system bookings. *(Requires JWT)*
* `GET /bookings/:email` — Fetch bookings made by a specific student email. *(Requires JWT)*
* `PATCH /bookings/:id` — Cancel a booking request. Atomically restores the slot on the tutor profile. *(Requires JWT)*

### 3. Users Endpoints
* `PATCH /users/:id` — Update user profile display parameters. *(Requires JWT)*

---

## ⚙️ Getting Started (Local Setup)

To spin up the server locally, execute the following steps:

### 1. Clone the repository
```bash
git clone https://github.com/rahad404/mediqueue-server.git
cd mediqueue-server
```

### 2. Install package dependencies
```bash
npm install
```

### 3. Setup environment variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000
```

### 4. Boot the server
```bash
node index.js
```
The server will boot up and listen on [http://localhost:5000](http://localhost:5000).
