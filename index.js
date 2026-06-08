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
    const recruiterCollection = db.collection('user')
    const applicationCollection = db.collection('application-collection')

    app.get('/', (req, res) => {
      res.send('hireLoop server is running')
    })
 
    // jobs fetching by company ID
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

// job posting 
    app.post('/api/jobs', async (req, res) => {
      const job = req.body;
      const newJob = {
        ...job,
        createdAt: new Date()
      }
      console.log("Received:", newJob);
      const result = await jobCollection.insertOne(newJob);
      res.json({ insertedId: result.insertedId.toString() })
    })

    // company data saving
  app.post('/api/companies', async (req, res) => {
    const company = req.body;
    const newCompany = {
      ...company,
      createdAt: new Date()
    }
    console.log(newCompany, 'company data processed')
    const result = await companyCollection.insertOne(newCompany)
    res.json({insertedId: result.insertedId.toString()})
  })

  // all recruiter data fetching
  app.get('/api/allRecruiter', async (req, res) => {
    const result = await recruiterCollection.find().toArray()
    res.json(result)
  })

  
  // all company data fetching
  app.get('/api/companies', async (req, res) => {
    const result = await companyCollection.find().toArray()
    res.json(result)
  })

 // all jobs data fetching
  app.get('/api/jobs', async (req, res) => {
    const result = await jobCollection.find().toArray()
    res.json(result)
  })

  // job details data fetching
  app.get('/api/jobs/:id', async (req, res) => {
    const id = req.params.id;
    const query = {_id : new ObjectId(id)}
    const result = await jobCollection.findOne(query)
    res.json(result)
    
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

  // company data update
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

// application post 

app.post('/api/applications', async (req, res) => {
  const application = req.body;
      const newApplication = {
        ...application,
        createdAt: new Date()
      }
      console.log("Received:", newApplication);
      const result = await applicationCollection.insertOne(newApplication);
      res.json({ insertedId: result.insertedId.toString() })
} )

// applications get by applicant id and job id separately
app.get(`/api/applications`, async (req, res) =>{
  const query = {};
  if(req.query.applicantId){
    query.applicantId = req.query.applicantId;
  }
  if(req.query.jobId){
    query.jobId = req.query.jobId
  }

  const result = await applicationCollection.find(query).toArray();
  res.json(result)

})


  } catch(err) {
    console.error(err);
    
  }
}

 

run().catch(console.dir);

app.listen(port, () => {
  console.log(`hireLoop server is running in ${port}`)
})