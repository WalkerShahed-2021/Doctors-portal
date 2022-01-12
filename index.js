const express = require('express');
const app = express();
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000;


const serviceAccount = require('./doctors-portal-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//medle ware
const cors = require('cors')
app.use(cors());
app.use(express.json());
require('dotenv').config()


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rzrcq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function veryfyToken(req, res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const token = req.headers.authorization.split(' ')[1];

        try{
           
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;

        }
        catch{

        }
        
    }
     next();
}

async function run(){
    try{
        await client.connect();
        const databasen = client.db('doctors_portal');
        const appointmentsCollection = databasen.collection('appoinments');
        const UsersCollection = databasen.collection('users');

        app.get('/appoinments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = {email: email, date: date}
            const cursor = appointmentsCollection.find(query);
            const appoinments = await cursor.toArray();
            res.json(appoinments);
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const quary = {email: email};
            const user = await UsersCollection.findOne(quary)
            let isAdmin = false;
            if(user?.role === 'admin'){
                isAdmin = true;
            }
            res.json({admin: isAdmin});
        })

         


         //post data
        app.post('/appoinments', veryfyToken, async (req, res) =>{
             const appoinments = req.body;
             const result = await appointmentsCollection.insertOne(appoinments);
             res.json(result)
        })

          
        //save data
        app.post('/users', async (req, res) =>{
             const user = req.body;
             const result = await UsersCollection.insertOne(user);
             console.log(result);
             res.json(result)
        })

        //update user
        app.put('/users', async (req, res) =>{
             const user = req.body;
            const filter = {email: user.email}
            const options = { upsert: true };
            const updateDoc = {$set: user};
            const result = await UsersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })
        
        app.put('/users/admin', veryfyToken, async (req, res) =>{
             const user = req.body;
             const requster = req.decodedEmail;
             if(requster){
                 const reuesterAccount = await UsersCollection.findOne({email: requster});
                 if(reuesterAccount.role === 'admin'){
                    const filter = {email: user.email};
                    const updateDoc = { $set: {role: 'admin'}};
                    const result = await UsersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                 }
             }
             else{
                 res.status(403).json({message: 'you do not have access to make an admin'});
             }
        })

        
          
    }
    finally{
        //await client.close();
    }

}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('doctor portal is cooming')
})

app.listen(port, () =>{
    console.log('listing to port');
})


/* 
         app.get('/users')
         app.post('/users')
         app.get('/users/:id')
         app.put('/users/:id')
         app.delete('/users/:id')
        //user get
        //user post 
*/