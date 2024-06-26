const mongoose = require("mongoose");

const PostSchema = mongoose.Schema({
    title : {
        type : String , 
        required : true, 
    } , 
    description : {
        type: String,
        required: true,
    } , 

    cover : {
        type : String , 
        required : true
    }, 
    essay : {
        type : String , 
        required : true
    },
    tag : {
        type : String , 
        required : true
    },
    viewCount: {
        type: Number,
        default: 0
    } ,
    likes : [{
        type : mongoose.Schema.Types.ObjectId , 
        ref : "BlogUser"
    }] ,
    comments : [{
       text : String , 
       username : String ,
       userImage : String ,
       postedBy : { type : mongoose.Schema.Types.ObjectId , ref : "BlogUser"},
       isAdmin : Boolean
    }] ,
    author : {
         type : mongoose.Schema.Types.ObjectId , ref : "BlogUser"
        } 
} , 
{
    timestamps : true
})

const PostModel = mongoose.model('BlogPost' , PostSchema);
module.exports = PostModel;