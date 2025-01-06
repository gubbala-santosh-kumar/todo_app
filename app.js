const express = require('express');
const { Todo } = require("./models"); 
const bodyParser = require('body-parser');
const path = require('path');
const { url } = require('inspector');

const passport = require('passport');
const connectEnsurelogin = require('connect-ensure-login');
const session = require('express-session');
const LocalStrategy = require('passport-local');

const app = express();

const bcrypt = require('bcrypt');

const saltRounds = 10;

app.use(bodyParser.json());

app.use(express.urlencoded({extended:false}));

app.use(session({
    secret: "my-super-secret-key-234565432345",
    cookie: {
        maxAge: 24*60*60*1000 // 1 hour 
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (username, password, done)=>{
    User.findOne({ where : { email : username, password: password}})
    .then((user)=>{
        return done(null,user);
    }).catch((error)=>{
        return(error);
    })
}));

passport.serializeUser((user, done)=>{
    console.log("Serializing user in session",user.id)
    done(null,user.id)
});

passport.deserializeUser((id, done) => {
    User.findByPk(id)
        .then((user) => {
            done(null, user);
        })
        .catch((error) => {
            done(error, null);
        });
});


app.set("view engine","ejs");

const {User}=require('./models');
const { error } = require('console');
const { title } = require('process');

app.get('/', async(req,res)=>{
    res.render('index',{
        title: "Todo application",
    });
});

app.get('/todos', connectEnsurelogin.ensureLoggedIn(), async(req,res)=>{
    const allTodos = await Todo.getTodos();
    const today = new Date().toISOString().split('T')[0];
    const overdue = allTodos.filter(todo => todo.dueDate < today);
    const dueToday = allTodos.filter(todo => todo.dueDate === today);
    const dueLater = allTodos.filter(todo => todo.dueDate > today);

    if (req.accepts("html")) {
        res.render('todos', {
            allTodos,
            overdue,
            dueToday,
            dueLater
        });
    } else {
        res.json({ allTodos });
    }
});

app.get('/signup',(req,res)=>{
    res.render('signup',{title:"Signup"});
})

app.post('/users',async (req,res)=>{
    const hashedPwd = await bcrypt.hash(req.body.password, saltRounds);
    console.log(hashedPwd);
    try{
        const user = await User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hashedPwd
        })
        req.login(user,(err)=>{
            if (err){
                console.log(err);
            }
            res.redirect('/todos');
        })
    }
    catch(err){
        console.log(err);
    }
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        const user = await User.findOne({ where: { email: username } });
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    console.log("Serializing user in session", user.id)
    done(null, user.id)
});

passport.deserializeUser((id, done) => {
    User.findByPk(id)
        .then((user) => {
            done(null, user);
        })
        .catch((error) => {
            done(error, null);
        });
});

app.set("view engine", "ejs");

app.get('/', async (req, res) => {
    res.render('index', {
        title: "Todo application",
    });
});

app.get('/todos', connectEnsurelogin.ensureLoggedIn(), async (req, res) => {
    const allTodos = await Todo.getTodos();
    const today = new Date().toISOString().split('T')[0];
    const overdue = allTodos.filter(todo => todo.dueDate < today);
    const dueToday = allTodos.filter(todo => todo.dueDate === today);
    const dueLater = allTodos.filter(todo => todo.dueDate > today);

    if (req.accepts("html")) {
        res.render('todos', {
            allTodos,
            overdue,
            dueToday,
            dueLater
        });
    } else {
        res.json({ allTodos });
    }
});

app.get('/signup', (req, res) => {
    res.render('signup', { title: "Signup" });
})

app.post('/users', async (req, res) => {
    
});

app.get('/login',(req,res)=>{
    res.render('login',{title:"Login"});
})

app.post('/session', passport.authenticate('local',{failureRedirect : "/login"}),(req,res)=>{
    console.log(req.user);
    res.redirect('/todos');
})

app.get('/signout',(req,res,next)=>{
    req.logout((err)=>{
        if(err) { return next(err)}
        res.redirect("/");
    })
})

app.use(express.static(path.join(__dirname,'public')));

// GET all todos
app.get('/todos',connectEnsurelogin.ensureLoggedIn(), async (req, res) => {
    console.log("Todo list",req.body);
});

// POST a new todo
app.post('/todos',connectEnsurelogin.ensureLoggedIn(), async (req, res) => {
    console.log("Creating a Todo", req.body);

    try {
        
        const todo = await Todo.create({
            title: req.body.title,
            dueDate: req.body.dueDate,
            completed: req.body.completed
        });
        console.log(todo);
        return res.redirect("/");
    } catch (error) {
        console.log(error);
        return res.status(422).json({ error: "Failed to create todo" });
    }
});

// PUT to mark a todo as completed
app.put('/todos/:id/markAsCompleted', connectEnsurelogin.ensureLoggedIn(), async (req, res) => {
    console.log("Marking Todo as completed", req.params.id);

    try {
        const todo = await Todo.findByPk(req.params.id);
        if (!todo) {
            return res.status(404).json({ error: "Todo not found" }); 
        }

        todo.completed = true;
        await todo.save(); 
        return res.json(todo); 
    } catch (error) {
        console.log(error);
        return res.status(422).json({ error: "Failed to update todo" });
    }
});

// DELETE a todo
app.delete('/todos/:id', connectEnsurelogin.ensureLoggedIn(), async (req, res) => {
    console.log("Deleting Todo", req.params.id);

    try{
        await Todo.remove(req.params.id);
        return res.json({success:true});
    }
    catch(err){
        console.log("Getting error while Deleting",err);
        return res.status(422).json(err);
    }
});

module.exports = app;