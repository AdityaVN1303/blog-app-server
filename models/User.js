const mongoose = require("mongoose");
const {Schema , model} = mongoose;

const UserSchema = mongoose.Schema({
    username : {
        type : String , 
        required : true, 
        min : 4, 
        unique : false
    } , 
    email : {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: 'Email address is required',
    } , 

    password : {
        type : String , 
        required : true, 
        unique : false
    } ,

    image : {
        type : String , 
        required : true, 
        unique : false
    }
})

const UserModel = mongoose.model('BlogUser' , UserSchema);
module.exports = UserModel;