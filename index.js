const express = require('express')
const cors = require('cors')
const app = express()
const jwt =  require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.66lxfzt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJwt = (req,res,next)=>{
  // console.log('authorization',req.headers.authorization);
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error: true, message : 'unauthorized access'})
  }
  const token = authorization.split(' ')[1]
  // console.log('token inside ', token);
  jwt.verify(token,process.env.Access_token_secret,(error,decoded)=>{
    if(error){
      res.status(403).send({error : true, message : 'unauthorized access'} )
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings')


    // JWT
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user,process.env.Access_token_secret,{
        expiresIn : '1hr'
      });
      res.send({token})
    })

    app.get('/services', async(req,res)=>{
        const cursor = serviceCollection.find()
        const result = await cursor.toArray()
        res.send(result);
    })

    app.get('/services/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}

        const options = {
           
            // Include only the `title` and `imdb` fields in the returned document
            projection: {  title: 1, service_id: 1 ,description: 1, price: 1,img:1},
          };

        const result =  await serviceCollection.findOne(query,options)
        res.send(result)
    })

    app.get('/bookings',verifyJwt,async(req,res)=>{
      const decoded  = req.decoded
      console.log('come back after verify', decoded);
      if(decoded.email !== req.query.email){
        return res.status(403).send({error : 1, message :'forbidden access'})
      }
      let query = {}
      if(req.query?.email){
        query = {email :  req.query.email}
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })
    // bookings
    app.post('/bookings', async(req,res)=>{
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })

    app.patch('/bookings/:id', async(req,res)=>{
      const id = req.params.id
      const filter = {_id  : new ObjectId(id)}
      const updatingBookings = req.body
      console.log(updatingBookings);
      const updateDoc = {
        $set: {
          status : updatingBookings.status
        },
      };

      const result = await bookingCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.delete('/bookings/:id', async(req,res)=>{
      const id = req.params.id

      const query = {_id: new ObjectId(id)}
      const result= await bookingCollection.deleteOne(query)
      res.send(result)
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
    res.send('doctor is running')
})

app.listen(port, ()=>{
    console.log(`car  doctor is running on port ${port}`);
})