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

  if(!session) {
      return res.status(403).send({message: 'forbidden'})
  }
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
 
    // all jobs data fetching
    app.get('/api/jobs', async (req, res) => {
  try {
    console.log(req.query, 'search params') // ক্লায়েন্ট সাইড থেকে আসা সার্চ অবজেক্ট কুয়েরির মধ্যে সেট করা হয়েছিল, সেটা এখান থেকে দেখা যাচ্ছে।
    const query = {}

    // ফিল্টারিং
     if(req.query.title){
      query.$or =[ 
        {title:{$regex: req.query.title, $options: 'i'}  },
         {responsibilities:{$regex: req.query.title, $options: 'i'}  },
         {requirements:{$regex: req.query.title, $options: 'i'}  },
         {benefits:{$regex: req.query.title, $options: 'i'}  },
         {company:{$regex: req.query.title, $options: 'i'}  },

      ] // or অপারেটর দিয়ে একাধিক ফিল্ডে সার্চ করছি। রেগুলার এক্সপ্রেশন দিয়ে আংশিক অক্ষর দিয়ে সার্চ দিচ্ছি, অপশনে i মানে ইগনোর কেস। এগুলো মঙ্গোডিবি থেকে আসছে
    }
    if(req.query.type){
      query.type = req.query.type
    }
    if(req.query.category){
      query.category = req.query.category
    }
   if(req.query.isRemote !== undefined && req.query.isRemote !== ''){
      query.isRemote = (req.query.isRemote === 'true')
    }

  
 
    const result = await jobCollection.find(query).toArray();
    res.json(result);

  } catch (err) {
    console.error(err); // terminal এ exact error দেখাবে
    res.status(500).json({ error: err.message });
  }
});


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
  try {
    const search = req.query.search ? req.query.search.trim() : '';

    // পাইপলাইনের শুরুতে একটি খালি অ্যারে রাখছি
    const pipeline = [];

    // যদি সার্চ কুয়েরি থাকে, তবেই ফিল্টারিং পাইপলাইন যোগ হবে
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // আপনার আগের $skip স্টেপ (প্রয়োজন হলে রাখতে পারেন)
    pipeline.push({ $skip: 0 });

    const result = await companyCollection.aggregate(pipeline).toArray();
    console.log(result, 'result');
    res.json(result);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


  // job details data fetching
  app.get('/api/jobs/:id', async (req, res) => {
    const id = req.params.id;
    const query = {_id : new ObjectId(id)}
    const result = await jobCollection.findOne(query)
    res.json(result)
    
  })

// company data fetching with recruiter ID
app.get('/api/myCompany', verifyToken, verifyRecruiter, async (req, res) => {
  try {
    const recruiterId = req.query.recruiterId;

    // ১. ভেরিফিকেশন (আইডি না থাকলে বা ম্যাচ না করলে)
    if (!recruiterId || req.user._id.toString() !== recruiterId) {
      return res.status(403).json({ message: 'Forbidden access' });
    }

    const query = { recruiterId: recruiterId };
    const result = await companyCollection.findOne(query);

    // ২. ডেটাবেজে যদি কোম্পানি খুঁজে পাওয়া না যায়
    if (!result) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // ৩. সাকসেস রেসপন্স
    console.log(result, 'company id by recruiter id');
    return res.json(result);

  } catch (error) {
    // ৪. কোনো ইন্টারনাল এরর হলে সার্ভার ক্রাশ করবে না, এখান থেকে হ্যান্ডেল হবে
    console.error("Database error:", error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

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