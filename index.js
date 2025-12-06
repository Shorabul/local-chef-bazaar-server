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

        app.get('/users', async (req, res) => {
            try {
                const result = await usersCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to fetch users' });
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
