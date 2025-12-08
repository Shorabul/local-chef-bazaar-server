const express = require('express');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        await client.connect();

        const db = client.db('local_chef_bazaar_db');
        const usersCollection = db.collection('users');
        const roleRequestsCollection = db.collection('roleRequests');
        const mealsCollection = db.collection('meals');

        app.get('/users', async (req, res) => {
            try {
                const result = await usersCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to fetch users' });
            }
        });
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            try {
                const result = await usersCollection.findOne({ email });
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to fetch users' });
            }
        });

        app.get('/users/:email/role', async (req, res) => {
            const email = req.params.email;

            try {
                const user = await usersCollection.findOne(
                    { email },
                    { projection: { role: 1, _id: 0 } } // return ONLY role
                );

                if (!user) {
                    // console.error("Error fetching user role:", error);
                    return res.status(404).send({ role: "user" });
                }

                res.send({ role: user.role || 'user' });
            } catch (error) {
                res.status(500).send({ role: "user" });
            }
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            user.role = 'user';
            user.createAt = new Date();

            const email = user.email;
            const userExists = await usersCollection.findOne({ email });
            if (userExists) {
                return res.send({ message: 'user exists' });
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            const { status } = req.body;

            try {
                const result = await usersCollection
                    .updateOne({ email: email },
                        { $set: { status: status } }
                    );
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to update user' });
            }
        });


        app.get('/role-requests', async (req, res) => {
            const requests = await roleRequestsCollection.find({}).toArray();
            res.send(requests);
        });

        app.post('/role-requests', async (req, res) => {
            const { userName, userEmail, requestType } = req.body;

            try {
                // Check if a pending request already exists
                const exists = await roleRequestsCollection.findOne({
                    userEmail,
                    requestType,
                    requestStatus: "pending"
                });

                if (exists) {
                    return res.status(400).send({
                        success: false,
                        message: "You already have a pending request for this role."
                    });
                }

                // Insert new role request
                const newRequest = {
                    userName,
                    userEmail,
                    requestType,
                    requestStatus: 'pending',
                    requestTime: new Date()
                };

                const result = await roleRequestsCollection.insertOne(newRequest);

                // Update user collection to track the pending request
                await usersCollection.updateOne(
                    { email: userEmail },
                    { $set: { [`roleRequest.${requestType}`]: "pending" } }
                );

                res.send({ success: true, data: result });
            } catch (error) {
                console.error(error);
                res.status(500).send({ success: false, message: "Server error" });
            }
        });

        app.post('/meals', async (req, res) => {
            const mealInfo = req.body;
            try {
                const result = await mealsCollection.insertOne(mealInfo);
                res.send({ success: true, data: result });
            } catch (error) {
                console.error(error);
                res.status(500).send({ success: false, message: "Server error" });
            }
        });




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});
