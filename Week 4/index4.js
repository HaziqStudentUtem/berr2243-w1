const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const port = 3000;

const app = express();
app.use(cors());
app.use(express.json());

let db;

async function connectToMongoDB() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        db = client.db("testDB");
    } catch (err) {
        console.error("Error:", err);
    }
}

connectToMongoDB();

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

//--------------------------------RIDES--------------------------------//

// GET /rides - Fetch All Rides
app.get('/rides', async (req, res) => {
    try {
        const rides = await db.collection('rides').find().toArray();
        res.status(200).json(rides);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch rides" });
    }
});

// DELETE /rides/:id - Cancel A Ride
app.delete('/rides/:id', async (req, res) => {
    try {
        const result = await db.collection('rides').deleteOne(
            { _id: new ObjectId(req.params.id) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Ride Not Found" });
        }
        res.status(200).json({ deleted: result.deletedCount });
    } catch (err) {
        res.status(400).json({ error: "Invalid Ride Id" });
    }
});

//--------------------------------DRIVERS--------------------------------//

// 3. PATCH /drivers/:id/status - Update driver status
app.patch('/drivers/:id/status', async (req, res) => {
    try {
        const result = await db.collection('drivers').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: req.body.status } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Driver Not Found" });
        }

        res.status(200).json({ updated: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: "Invalid Driver ID or Data" });
    }
});


/// CREATE - Add a new driver
app.post('/drivers', async (req, res) => {
    try {
        const driver = req.body;

        // If rating is provided, round it
        if (typeof driver.rating === 'number') {
            driver.rating = Math.round(driver.rating * 10) / 10;
        }

        const result = await db.collection('drivers').insertOne(driver);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: 'Invalid Driver Data' });
    }
});

//--------------------------------USER--------------------------------//

// POST /rides - Create a new ride 
app.post('/users/add', async (req, res) => {
    try {
        const result = await db.collection('rides').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: "Invalid Ride Data" });
    }
});

// POST /users/register - Create a new user 
app.post('/users/register', async (req, res) => {
    try {
        const { name, age, email, password, isAdmin = false } = req.body;

        if (!name || !age || !email || !password) {
            return res.status(400).json({ error: "Name, age, email, and password are required" });
        }

        const result = await db.collection('users').insertOne({ name, age, email, password, isAdmin });
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: "Invalid User Data" });
    }
});

// POST /users/login - User login
app.post('/users/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await db.collection('users').findOne({ email, password });

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Login successful, return user profile (excluding password)
        const { _id, name } = user;
        res.status(200).json({ _id, name, email });
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// UPDATE - Modify a driver by ID
app.patch('/drivers/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { rating } = req.body;

        // Ensure the rating is a number
        if (typeof rating !== 'number') {
            return res.status(400).json({ error: 'Rating must be a number' });
        }

        // Find the existing driver
        const driver = await db.collection('drivers').findOne({ _id: new ObjectId(id) });

        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        // Update the driver's rating
        const updatedDriver = {
            ...driver,
            rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
        };

        const result = await db.collection('drivers').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedDriver }
        );

        // Return the updated driver
        res.json(updatedDriver);

    } catch (err) {
        console.error("❌ Failed to update driver rating:", err);
        res.status(500).json({ error: 'Failed to update driver rating' });
    }
});

//--------------------------------ADMIN--------------------------------//

// READ - Get drivers (optionally filter by availability and rating)
app.get('/drivers/add', async (req, res) => {
    try {
        const query = {};
        if (req.query.isAvailable) {
            query.isAvailable = req.query.isAvailable === 'true';
        }
        if (req.query.minRating) {
            query.rating = { $gte: parseFloat(req.query.minRating) };
        }

        const drivers = await db.collection('drivers').find(query).toArray();

        // Return drivers without calculating average rating
        res.json(drivers);
    } catch (err) {
        console.error("❌ Failed to fetch drivers:", err);
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

// DELETE - Remove driver by ID
app.delete('/drivers/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await db.collection('drivers').deleteOne({ _id: new ObjectId(id) });
        res.json({ deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete driver' });
    }
});

// 4. DELETE /admin/users/:id - Admin only delete user
app.delete('/admin/users/:id', async (req, res) => {
    try {
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });

        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: "Forbidden: Admins only" });
        }

        const result = await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "User Not Found" });
        }

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /admin/users - Fetch All users (Admin only)
app.get('/admin/users', async (req, res) => {
    try {
        const users = await db.collection('users').find().toArray();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});





























































