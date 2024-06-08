require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT || 5000;


//Middleware
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3mmbmgw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function dbConnect() {
    try {
        // await client.db('admin').command({ ping: 1 })
        console.log('You successfully connected to MongoDB!')
    } catch (err) {
        console.log(err)
    }
}
dbConnect()
const classCollection = client.db("goldGymDB").collection("classes");
const reviewsCollection = client.db("goldGymDB").collection("reviews");
const postsCollection = client.db("goldGymDB").collection("posts");

app.get('/', (req, res) => {
    res.send('Hello GoldGYM!')
})

app.get('/featured&classes', async (req, res) => {
    const result = await classCollection.find().sort({ number_of_bookings: -1 }).toArray();
    res.send(result.slice(0, 6))
})

//Review
app.get('/reviews', async (req, res) => {
    const result = await reviewsCollection.find().toArray();
    res.send(result);
})

//Community posts
app.get('/getPost', async (req, res) => {
    const result = (await postsCollection.find().toArray()).reverse();
    res.send(result.slice(0, 6))
})

app.listen(port, () => {
    console.log(`GoldGYM is running on port ${port}`)
})
