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

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'Unauthorized access'})
  }
  const token = authHeader.split(' ')[1]
   if(!token){
    return res.status(401).send({message: 'Unauthorized access'})
  }

  console.log(authHeader,'auth header', token, 'token' )
next()
}


async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    const db = client.db('hireLoop-user')
    const jobCollection = db.collection('hireloop-jobs');
    const companyCollection = db.collection('company-collection')
    const userCollection = db.collection('user')
    const applicationCollection = db.collection('application-collection')
    const plansCollection = db.collection('plans')
    const subscriptionCollection = db.collection('subscription_collection')
    const sessionCollection = db.collection('session')



    // verification related 
    const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'Unauthorized access'})
  }
  const token = authHeader.split(' ')[1]
   if(!token){
    return res.status(401).send({message: 'Unauthorized access'})
  }

  const query = {token: token}
  const session = await sessionCollection.findOne(query)
  const userQuery = {_id : session.userId}
  const user = await userCollection.findOne(userQuery)
  req.user = user
next()
}

const verifySeeker = async (req, res, next) => {
  const user = req.user
  if(user.role !== 'seeker'){
    return res.status(403).send({message: 'forbidden'})
  }
  next()
}

const verifyRecruiter = async (req, res, next) => {
  const user = req.user
  if(user.role !== 'recruiter'){
    return res.status(403).send({message: 'forbidden'})
  }
  next()
}

const verifyAdmin = async (req, res, next) => {
  const user = req.user
  if(user.role !== 'admin'){
    return res.status(403).send({message: 'forbidden'})
  }
  next()
}

    app.get('/', (req, res) => {
      res.send('hireLoop server is running')
    })
 
    // jobs fetching by company ID
    app.get('/api/jobs', verifyToken, verifyRecruiter, async (req, res) => {
    
      const companyQuery = {recruiterId : req.user._id.toString()}
      const companyData = await companyCollection.findOne(companyQuery)
     
      // verification 
      if(req.user._id.toString() !== companyData.recruiterId){
        return res.status(403).send({message: 'forbidden'})
      }



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
    app.post('/api/jobs', verifyToken, verifyRecruiter, async (req, res) => {
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
    const result = await userCollection.find().toArray()
    res.json(result)
  })

  
  // all company data fetching
app.get('/api/companies', verifyToken, async (req, res) => {
  const pipeline = [
    { $skip: 0 }
  ]
  const result = await companyCollection.aggregate(pipeline).toArray()
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
  app.get('/api/myCompany', verifyToken, verifyRecruiter, async (req, res) => {

  
 // verification 
      if(req.user._id.toString() !== req.query.recruiterId){
        return res.status(403).send({message: 'forbidden'})
      }


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
app.get(`/api/applications`, verifyToken, verifySeeker, async (req, res) =>{
  const query = {};
  if(req.query.applicantId){
    query.applicantId = req.query.applicantId;
  }
  if(req.query.jobId){
    query.jobId = req.query.jobId
  }
  if(req.user._id.toString() !== req.query.applicantId){
    return res.status(403).send({message: 'forbidden'})
  }
  console.log(req.user, req.query.applicantId)
  const result = await applicationCollection.find(query).toArray();
  res.json(result)

})

//  plans data fetching
app.get('/api/plans', async (req, res) => {
  const query = {}
  if(req.query.planId){
    query.planId = req.query.planId
  }
  const result = await plansCollection.findOne(query)
   res.json(result)
})

  // subscription handle
  app.post('/api/subscription', async (req, res) => {
    const data = req.body;
    const subInfo = {
      ...data,
      createdAt: new Date()
    }
    const result = await subscriptionCollection.insertOne(subInfo)


    // update user data
    const filter = {email: data.email}

    const updateDocument = {
      $set: {
        plan: data.planId
      }
    }
    const updateResult = userCollection.updateOne(filter, updateDocument)

    res.json(updateResult)
  })

  // company approving 
  app.patch('/api/companies/:id', verifyToken, verifyAdmin, async (req, res) => {
       console.log('patch hit', req.params.id, req.body)
    const id = req.params.id;
    const filter = {_id : new ObjectId(id)}
    const updateCompany = req.body
    const updateDoc = {
      $set: {status : updateCompany.status}
    }
    const result = await companyCollection.updateOne(filter, updateDoc)
       if (result.modifiedCount > 0) {
        res.json({ success: true, message: 'Status updated' })
    } else {
        res.status(403).json({ success: false, message: 'Company not found' })
    }
  })

  } catch(err) {
    console.error(err);
    
  }
}

 

run().catch(console.dir);

app.listen(port, () => {
  console.log(`hireLoop server is running in ${port}`)
})