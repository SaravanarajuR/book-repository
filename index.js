const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
var flash = require('connect-flash');
var app = express();
const bcrypt = require("bcrypt");
const multer = require("multer");
const path=require('path');
const fs=require('fs');
const { homedir } = require("os");
const {check ,expressValidator,validationResult } =require('express-validator');
const expressSession=require('express-session');


const storage=multer.diskStorage({
    destination:function(req,file,cb){
     cb(null,path.join('./public/uploads/'))
    },
    filename:function(req,file,cb){ 
        cb(null, new Date().toISOString().replace(/:/g, '-')+file.originalname)  
    }
})

const upload =multer({storage:storage});

var multiple=upload.any([ {name:'image'},{name:'pdf'}])

app.use(express.static('uploads'));

app.use(bodyParser.json());
app.use(flash());


app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public"));

app.use(expressSession({secret:'qwertyuiopmnblkj',saveUninitialized:false,resave:false}));

mongoose.connect("mongodb://localhost:27017/loginEL",{useNewUrlParser:true,
   useUnifiedTopology:true},err=>{
      
   });

const loginSchema = {
    email: String,
    password: String,
    registerNumber:String,
    class:String,
}

const bookSchema = {
    name: {type:String,index:true},
    author: {type:String,index:true},
    subject: {type:String,index:true},
    class:{type:String,index:true},
    image:{
       type:String
    },
    pdf:{
        type:String
    }

}


const Sign = mongoose.model("Sign", loginSchema);

const Material = mongoose.model("Material", bookSchema);

app.get("/signup",(req, res) => {
    res.render("signup", {data :{ message:'success',error:req.session.error}});
    error={};
})

app.get("/login",  (req, res) => {
    res.render("login")
})

app.get('/admin/userDetails',(req,res)=>{
    Sign.find({},function(err,data){
          res.render('userDetails',{users:data})
    })
})

app.get("/home", (req, res) => {
        Material.find({},function(err,mat){
           res.render('home',{
               materialList:mat
           });
        })
       });

app.get('/books/search',(req,res)=>{
  Material.find({$text: {$search:req.query.search}},function(err,data){
        res.render('home',{materialList:data})
    })
})

app.get("/admin",(req, res) =>{
    res.render("admin")
})
app.get("/admin/addbooks",  (req, res) => {
    res.render("addBooks")
})
app.get('/admin/books',(req,res)=>{
    Material.find({},function(err,mat){
        res.render('deleteBook',{
            materialList:mat
        });
     })
    });

app.post("/admin/addbooks", multiple,(req, res)=> {
     
    const book = new Material({
        name: req.body.name,
        author: req.body.author,
        subject: req.body.subject,
        class:req.body.class,
        image:req.files[0].filename,
        pdf:req.files[1].filename,
        })
    book.save();
    res.redirect("/admin");
});




app.post("/signup",[ check('mail').isEmail().withMessage('invalid email'),check('pass').isLength({min:8}).withMessage('password must contain atleast 8 characters')] ,async function (req, res) {
    const error=validationResult(req);
    console.log(error);

if(error.isEmpty()){
    if ( req.body.pass === req.body.cpass) {
        const hashedPass = await bcrypt.hash(req.body.cpass, 12)
        const data = new Sign({
            email: req.body.mail,
            password: hashedPass,
        })
        data.save();
        res.redirect('/login');
        req.session.error=false;
    }
    else {  
        res.redirect("/signup");
    }}
else{
    res.redirect("/",);      
}
})

app.get('/pass-error',(req,res)=>{
    req.flash('message', 'Password must contain 8 characters.');
    res.redirect('/signup');
    });

app.get('/deleteBook/:id',async (req,res)=>{
    const id=req.params.id;
   Material.findOne({_id:id},function(err,find){
        const imagePath= find.image;
        const pdfPath= find.pdf;


        fs.unlink(path.join(__dirname,'public/uploads',imagePath),(err)=>{ console.log(err) })
        fs.unlink(path.join(__dirname,'public/uploads',pdfPath),(err)=>{ console.log(err) })
 
        Material.deleteOne({_id:id},function(err){
            console.log(err);
        })
    });
    


})

app.post("/login", async function (req, res) {
    try {
        const user = await Sign.findOne({ email: req.body.mail });
        if (user) {
            const cmp = await bcrypt.compare(req.body.pass, user.password);
            if (cmp) {
                res.send("success");
            }
            else {
                res.send("wrong pass");
            }
        }
        else {
            res.send("wrong username or pass");
        }
    } catch (err) {
        console.log(err);
    }
});

app.listen(3000, function () {
    console.log("server started");
});