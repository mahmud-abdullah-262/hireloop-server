const express = require('express')
const app = express()
const port = process.env.PORT || 8000
const cors = require('cors');
require('dotenv').config()

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_CONNECTION;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.use(cors())
app.use(express.json())

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    const db = client.db('hireLoop-user')
    const jobCollection = db.collection('hireloop-jobs');
    const companyCollection = db.collection('company-collection')

    app.get('/', (req, res) => {
      res.send('hireLoop server is running')
    })

    app.get('/api/jobs', async (req, res) => {
      const query = {};
      if(req.query.companyId){
        query.companyId = req.query.companyId;
      }
      if(req.query.status){
        query.status = req.query.status;
      }
      const cursor = jobCollection.find(query);
      const jobs = await cursor.toArray();
      res.json(jobs);
    }
)

    app.post('/api/jobs', async (req, res) => {
      const job = req.body;
      console.log("Received:", job);
      const result = await jobCollection.insertOne(job);
      res.json({ insertedId: result.insertedId.toString() })
    })

    // company data saving
  app.post('/api/companies', async (req, res) => {
    const company = req.body
    console.log(company, 'company data processed')
    const result = await companyCollection.insertOne(company)
    res.json({insertedId: result.insertedId.toString()})
  })

  // company data fetching with recruiter ID

  app.get('/api/myCompany', async (req, res) => {
    const query = {}
    if(req.query.recruiterId){
      query.recruiterId = req.query.recruiterId;
    }
    const result = await companyCollection.findOne(query);
    res.json(result)
  })


  app.patch('/api/myCompany/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  console.log(id, 'id', updatedData, "updatedData")

  // _id বা recruiterId যেন update না হয়
  delete updatedData._id;
  delete updatedData.recruiterId;

  const result = await companyCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );

  res.json(result);
});


  } catch(err) {
    console.error(err);
    
  }
}

 

run().catch(console.dir);

app.listen(port, () => {
  console.log(`hireLoop server is running in ${port}`)
})