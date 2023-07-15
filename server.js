const express = require("express"); 
const bcrypt = require('bcryptjs');
const session = require("express-session")
const MongoDBSession = require('connect-mongodb-session')(session); 
const mongoose = require("mongoose"); 
const app = express(); 
const path = require("path")
const cookieParser = require('cookie-parser')

const UserModel = require('./models/User'); 
const AdminModel = require('./models/Admin'); 
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
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")));
app.set('views', path.join(__dirname, 'views'));

// Cookies.set("admin", "true")

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
    res.render("landing"); 
    console.log("Cookies: ", req.cookies); 

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
    else{
        req.session.isAuth = true;  
        // Cookies.set("isAdmin", "false", {expires :2})
        return res.redirect('/dashboard'); 
    }
   
}); 


//Admin Login 

app.get("/loginAdmin", (req, res) =>{
    res.render("loginAdmin"); 
}); 

app.post("/loginAdmin", async (req, res) =>{
    const {email, password, role} = req.body; 
    const admin = await AdminModel.findOne({email}); 
    if(!admin){
        console.log("here"); 
        return res.redirect('/loginAdmin'); 
    }
    const matched = await bcrypt.compare(password, admin.password); 
    const roleMatch = await bcrypt.compare(role, admin.role); 

    if(!matched){
        console.log("aqui"); 
        return res.redirect('/loginAdmin'); 
    } else{
        req.session.isAdminAuth = true; 
        req.session.isAuth = true; 
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
    if(role === "admin"){
        admin = new AdminModel({
            username, 
            email, 
            password: hashPassword, 
            role
        }); 
        await admin.save(); 
        res.redirect("/loginAdmin"); 
    }
    else {
        user = new UserModel({
            username, 
            email, 
            password : hashPassword, 
            role
        }); 
    
        await user.save(); 
        res.redirect("/login"); 
    }
    

}); 

app.get("/adminDash", isAuth, isAdminAuth, (req, res) => {
    res.render("adminDash")
    // console.log("Cookies: ", req.cookies); 
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