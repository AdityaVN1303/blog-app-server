const mongoose = require('mongoose');

const connectDb = async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongo Success");
    } catch (error) {
        console.log("db connection failed");
        process.exit(0);
    }
}


module.exports = connectDb;