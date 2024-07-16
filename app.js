require('dotenv').config();
const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const connectCloudinary = require("./cloudinary");
const emailValidator = require('email-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const upload = require('./multer');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const User = require('./models/User');
const Post = require('./models/Post');

const app = express();
app.use(cors({credentials : true , origin : 'https://blog-app-client-sage.vercel.app'}));
app.use(express.json());
app.use(cookieParser());

connectCloudinary();
const connectDb = require('./dbConn');

// MiddleWare Code

const incrementViewCount = async (req, res, next) => {
    const { id } = req.params; // Extract post ID from request parameters

    try {
        const post = await Post.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true }); // Update and return modified document

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }// Attach updated post to the request object for later use (optional)
        next();
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Server error' });
    }
};

// End


const uploadImg = upload.single('file');
app.post('/register' , async (req , res)=>{
    try {

        uploadImg(req, res, async function(err) {

            if (err instanceof multer.MulterError) {
    
                if(err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({error : "Upload Image less than 100kb"})
    
            } else if (err) {
               return res.status(400).json({error : err});
            }
        const {username , email , password} = req.body;
        const imageFile = req.file;


        let user = await User.findOne({email : req.body.email}).select('-password');
        if (!req.body.username || !req.body.email || !req.body.password) {
            res.status(400).json({error : "Fill All Details"});
        }
        else if(user){
            res.status(200).json({error : "User Already Exist ! Please Login"});
        }
        else{
            if(!emailValidator.validate(req.body.email)){throw "Enter a Valid Email Address"};
            const hashedPassword = await bcrypt.hash(password , 10);

            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });

            const postDoc = await User.create({
                username ,
                email ,
                password : hashedPassword ,
                image : imageUpload.secure_url
            })
            console.log(postDoc);
            res.status(200).json(postDoc);
        }
    })
    } catch (error) {
        res.status(400).json({error : error , status : 400});
    }
})

const uploadPost = upload.single('file');
app.post('/post' , async (req , res)=>{
    try {
        uploadPost(req, res, async function(err) {

            if (err instanceof multer.MulterError) {
    
                if(err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({error : "Upload Image less than 100kb"})
    
            } else if (err) {
               return res.status(400).json({error : err});
            }
        const {title , description , essay , tag} = req.body;
        const imageFile = req.file
    
        const {token} = req.cookies;
            if(token){
                jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
                    if(err){
                        res.status(400).json({error : "Unauthorized !!!"})
                    }

                    const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
    
                    const postDoc = await Post.create({
                        title , 
                        description , 
                        cover : imageUpload.secure_url , 
                        essay,
                        tag ,
                        author : info.id
                    })
                    res.json(postDoc);
                });
            }
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({error : error});
    }

})

app.post('/login' , async (req , res)=>{
    const {email , password} = req.body;
    let user = await User.findOne({email});
    if(password && email){
        if(user){
            const pass = await bcrypt.compare(password , user.password);
            if (pass) {
                const token = jwt.sign({username : user.username , id : user._id} , process.env.JWT_KEY);
                res.cookie('token', token , {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'None'
                }
            ).status(200).json({loggedIn : true , id : user._id});

            } else {
                res.status(200).json({error : "Invalid Password"});
            }
        }
        else{
            res.status(400).json({error : "User not Found"});
        }
    }
    else{
        res.status(400).json({error : "Fill Complete Details"});
    }
})

app.get('/user/:id' , async (req, res)=>{
    try {
                const {token} = req.cookies;
                const {id} = req.params;
                if(token){
                    jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
                        if(err){
                            throw "Wrong Token ! Access Denied"
                        }
                        const user = await User.findById(id).select('-password');
                        res.status(200).json(user);

                    });
                }
                else{
                    res.status(400).json({error : "Unauthorized !!!"})
                }
            } catch (error) {
                res.status(400).json({error});
            }
})

app.post('/logout' , async (req , res)=>{
    res.cookie('token' , '').status(200).json({message : "Logged Out Successfully"});
    
})

app.get('/post' , async (req , res)=>{
    res.json(await Post.find().populate('author' , ['username']).sort({ createdAt: -1 }));
    
})

const updatePostImg= upload.single('file');
app.put('/post' , async (req , res)=>{
    try {
        updatePostImg(req, res, async function(err) {

            if (err instanceof multer.MulterError) {
    
                if(err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({error : "Upload Image less than 100kb"})
    
            } else if (err) {
               return res.status(400).json({error : err});
            }
    
        const {title , description , essay , id , tag} = req.body;
        const imageFile = req.file;
        const {token} = req.cookies;
            if(token){
                jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
                    if(err){
                        res.status(400).json({error : "Unauthorized !!!"})
                    }
                    // console.log(postDoc);

                    const postDoc = await Post.findById(id);
                    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
    
                    if (!isAuthor) {
                        res.status(400).json({error : "Only Author can edit his/her Post"});
                    }

                    if(imageFile){
                        await cloudinary.uploader.destroy(postDoc.cover.split("/").pop().split(".")[0]);
                        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
                        imageFile = imageUpload.secure_url;
                    }
    
                    const response = await postDoc.updateOne({
                        title , 
                        description , 
                        essay,
                        tag ,
                        cover : imageFile ? imageFile : postDoc.cover, 
                        author : info.id 
                    })
                    res.json(response);
                });
            }
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({error : error});
    }
})

const updateUserImg = upload.single('file')
app.put('/register/:id' , async (req , res)=>{
    try {

        updateUserImg(req, res, async function(err) {

            if (err instanceof multer.MulterError) {
    
                if(err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({error : "Upload Image less than 100kb"})
    
            } else if (err) {
               return res.status(400).json({error : err});
            }

        const {id} = req.params;
        const {username} = req.body;
        const imageFile = req.file;

        let user = await User.findById(id).select('-password');

    if(imageFile){
        await cloudinary.uploader.destroy(user.image.split("/").pop().split(".")[0]);
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
        imageFile = imageUpload.secure_url;
    }


            const postDoc = await user.updateOne({
                username ,
                image : imageFile ? imageFile : user.image, 
            })
            console.log(postDoc);
            res.status(200).json(postDoc);
        })
    } catch (error) {
        res.status(400).json({error : error , status : 400});
    }
})



app.put('/like/:id' , async (req , res)=>{

   const {id} = req.params;
   console.log(id);
   
   try {
    const {token} = req.cookies;
       if(token){
           jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
               if(err){
                   res.status(400).json({error : "Unauthorized !!!"})
               }

               const post = await Post.findByIdAndUpdate(id , {
                $push : {
                    likes : info.id

                } 
            },
                {
                    new : true
                }
            )
               console.log(post)
               res.json(post);
           });
       }
   } catch (error) {
    res.status(400).json(error);
   }

})

app.put('/comment/:id' , async (req , res)=>{

    const {id} = req.params;
    console.log(id);
    console.log(req.body);
    
    try {
     const {token} = req.cookies;
        if(token){
            jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
                if(err){
                    res.status(400).json({error : "Unauthorized !!!"})
                }
 
                const post = await Post.findByIdAndUpdate(id , {
                 $push : {
                     comments : {
                        text : req.body.comment,
                        username : req.body.username , 
                        userImage : req.body.userImage ,
                        postedBy : info.id,
                        isAdmin : info.id === req.body.author
                     }
                 } 
             },
                 {
                     new : true
                 }
             )
                console.log(post)
                res.json(post);
            });
        }
    } catch (error) {
     res.status(400).json(error);
    }
 
 })

 app.delete('/comment/' , async (req , res)=>{

    const postId = req.query.postId;
    const userId = req.query.userId;
    // console.log(id);
    
    try {
     const {token} = req.cookies;
        if(token){
            jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
                if(err){
                    res.status(400).json({error : "Unauthorized !!!"})
                }
 
                const post = await Post.findByIdAndUpdate(postId , {
                 $pull : {
                     comments : {
                        _id : userId
                     }
                 } 
             },
                 {
                     new : true
                 }
             )
                console.log(post);
                res.json(post);
            });
        }
    } catch (error) {
     res.status(400).json(error);
    }
 
 })


app.put('/unlike/:id' , async (req , res)=>{

    const {id} = req.params;
    console.log(id);
    
    try {
     const {token} = req.cookies;
        if(token){
            jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
                if(err){
                    res.status(400).json({error : "Unauthorized !!!"})
                }
 
                const post = await Post.findByIdAndUpdate(id , {
                 $pull : {
                     likes : info.id
 
                 } 
             },
                 {
                     new : true
                 }
             )
                console.log(post)
                res.json(post);
            });
        }
    } catch (error) {
     res.status(400).json(error);
    }
 
 })


app.delete('/post/:id' , async (req , res)=>{

    const {id} = req.params;
    // console.log(id);
    const {token} = req.cookies;
        if(token){
            jwt.verify(token , process.env.JWT_KEY , {} , async (err , info)=>{
                if(err){
                    res.status(400).json({error : "Unauthorized !!!"})
                } 

                const postDoc = await Post.findById(id);
                // console.log(postDoc);
                const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
                if (!isAuthor) {
                    res.status(400).json({error : "Only Author can edit his/her Post"});
                }

                const response = await Post.findByIdAndDelete(id);

                console.log(response);
                res.json(response);
            });
        }

})

app.get('/post/:id' , incrementViewCount , async (req , res)=>{
    try {
        const {id} = req.params;
    res.status(200).json(await Post.findById(id).populate('author' , ['username']));
    } catch (error) {
        res.status(400).json({error});
    }
    
})

app.get('/myposts/:id' , async (req , res)=>{
    try {
        const {id} = req.params;
    res.status(200).json(await Post.find({author : id}));
    } catch (error) {
        res.status(400).json({error});
    }
    
})


connectDb().then(()=>{
    app.listen(8000 , ()=>{
        console.log("Server Running on PORT 8000");
    });
})