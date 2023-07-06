const express = require("express"); 
const bcrypt = require('bcryptjs');
const session = require("express-session")
const MongoDBSession = require('connect-mongodb-session')(session); 
const mongoose = require("mongoose"); 
const app = express(); 
const path = require("path")

const UserModel = require('./models/User'); 
const mongoURI = "mongodb://localhost:27017/session";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,  
    useUnifiedTopology: true,
})
    .then(res=>{
        console.log("MongoDB Connected"); 
    })

const store = new MongoDBSession({
    uri : mongoURI, 
    collection: 'mySessions', 
})

app.set("view engine", "ejs"); 
app.use(express.urlencoded({extended: true})); 
app.use(express.static(path.join(__dirname, "public")));
app.set('views', path.join(__dirname, 'views'));



app.use(session({
    secret: 'key that will sign the cookie', 
    resave: false, 
    saveUninitialized: false,
    store: store, 
})); 

//will check req.session to see if true
const isAuth = (req, res, next) => {
    if(req.session.isAuth){
        next()
    }else{
        res.redirect("/login");
    }
}

const isAdminAuth = (req, res, next) => {
    if(req.session.isAdminAuth){
        next(); 
    }else{
        res.redirect("/dashboard"); 
    }
}

app.get("/", (req, res) => {
    // req.session.isAuth = true; 
    // console.log(req.session)
    // res.send("Hello Sessions"); 
    res.render("landing"); 

}); 

app.get("/login", (req,res) =>{
    res.render("login"); 
}); 

app.post("/login", async(req,res) =>{
    const {email, password} = req.body;
    
    const user = await UserModel.findOne({email}); 
    if(!user){
        return res.redirect('/login'); 
    }
    const matched = await bcrypt.compare(password, user.password); 

    // const adminMatched = (role === "admin") 
    if(!matched){
        return res.redirect('/login'); 
    }
    else if (user.role != "admin"){
        req.session.isAuth = true; 
        console.log("yur"); 
        return res.redirect('/dashboard'); 
    }
    else if(user.role === "admin"){
        req.session.isAuth = true; 
        req.session.isAdminAuth = true; 
        console.log(isAdminAuth); 
       return res.redirect('/adminDash'); 
    }
}); 

app.get("/register", (req,res) => {
    res.render("register")
}); 

app.post("/register", async (req,res) =>{
    const {username, email, password, role} = req.body; 

    let user = await UserModel.findOne({email}); 
    if(user){
        res.write("Email in use already")
        return res.redirect('/register')
        
    } 
    
    const hashPassword = await bcrypt.hash(password, 12); 
    user = new UserModel({
        username, 
        email, 
        password : hashPassword, 
        role
    }); 

    await user.save(); 
    res.redirect("/login"); 
}); 

app.get("/adminDash", isAuth, isAdminAuth, (req, res) => {
    res.render("adminDash")
})



app.get("/dashboard", isAuth, (req,res) => {
    res.render("dashboard")
}); 

app.post("/logout", (req,res) =>{
    req.session.destroy((err) => {
        if(err){
            throw err;
        }
        res.redirect("/"); 
    })
}); 


app.listen(5000, console.log("Server is working")); 