require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { access } = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
const postsCollection = client.db("goldGymDB").collection("posts");
const paymentsCollection = client.db("goldGymDB").collection("payments");
const requestsCollection = client.db("goldGymDB").collection("requests");
const reviewsCollection = client.db("goldGymDB").collection("reviews");
const trainersCollection = client.db("goldGymDB").collection("trainers");
const subscribersCollection = client.db("goldGymDB").collection("subscribers");
const usersCollection = client.db("goldGymDB").collection("users");

app.get('/', (req, res) => {
    res.send('Hello GoldGYM!')
})

//jwt
app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d'
    });
    res.send({ token })
})

//Middleware
const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
    })
}



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

//users 
app.post('/users', async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const existUser = await usersCollection.findOne(query);
    if (existUser) {
        return res.send({ message: 'user already exists', insertedId: null })
    }
    const result = await usersCollection.insertOne(user);
    res.send(result);
})

app.patch('/users/:email', async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const updateDoc = {
        $set: {
            role: 'member'
        }
    }
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result)
})

app.patch('/users&trainer/:email', async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const updateDoc = {
        $set: {
            role: 'trainer'
        }
    }
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result)
})

app.get('/users/admin/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    let admin = false;
    if (user) {
        admin = user.role === 'admin';
    }
    res.send({ admin })
})

//trainers
app.get('/trainers', async (req, res) => {
    const result = await trainersCollection.find().toArray();
    res.send(result);
})

app.get('/trainers/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await trainersCollection.findOne(query);
    res.send(result);
})
app.delete('/trainers/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await trainersCollection.deleteOne(query);
    res.send(result);
})

//classes
app.post('/classes', async (req, res) => {
    const classe = req.body;
    const result = await classCollection.insertOne(classe);
    res.send(result)
})

app.get('/featured&classes', async (req, res) => {
    const result = await classCollection.find().sort({ number_of_bookings: -1 }).toArray();
    res.send(result.slice(0, 6))
})
//requests
app.post('/requests', async (req, res) => {
    const request = req.body;
    const result = await requestsCollection.insertOne(request);
    res.send(result);
})

app.get('/requests', verifyToken, async (req, res) => {
    const result = await requestsCollection.find().toArray();
    res.send(result)
})

app.post('/request-confirm/:email', async (req, res) => {
    const email = req.params.email;
    const query = { email: email }
    const request = await requestsCollection.findOne(query);
    if (request) {
        const result = await trainersCollection.insertOne({
            name: request.name,
            email: request.email,
            image: request.image,
            age: request.age,
            skills: request.skills,
            available_days: request.available_days,
            available_times: request.available_times,
            description: request.description
        })
        res.send(result)
    }
    else {
        res.status(404).send({ message: 'Request not found' });
    }
})

app.delete('/request/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const result = await requestsCollection.deleteOne(filter);
    res.send(result)
})
app.delete('/request/:email', async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const result = await requestsCollection.deleteOne(filter);
    res.send(result)
})

//Subscrobers
app.post('/subscribers', async (req, res) => {
    const subscriber = req.body;
    const result = await subscribersCollection.insertOne(subscriber);
    res.send(result)
})
app.get('/subscribers', async (req, res) => {
    const result = await subscribersCollection.find().toArray();
    res.send(result);
})
//payments
app.post('/payments', async (req, res) => {
    const payment = req.body;
    const paymentResult = await paymentsCollection.insertOne(payment);
    res.send(paymentResult);
})
app.get('/payments', async (req, res) => {
    const result = await paymentsCollection.find().toArray();
    res.send(result.reverse().slice(0, 6))
})

//Payment-intent
app.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = price * 100;
    console.log('price inside the intend', amount)
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });

})

// app.get('/trainer/:id', async(req, res) => {
//     const id = req.params.id;
//     const query = {_id: new ObjectId(id)};
//     const result = await trainersCollection.findOne(query);
//     res.send(result);
// })

app.listen(port, () => {
    console.log(`GoldGYM is running on port ${port}`)
})
