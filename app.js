const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const connectEnsureLogin = require('connect-ensure-login');
const bcrypt = require('bcrypt');
const { User, Todo } = require('./models');

const app = express();
const saltRounds = 10;

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: "my-super-secret-key-234565432345",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// Passport configuration
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
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findByPk(id)
        .then(user => done(null, user))
        .catch(error => done(error, null));
});

// View engine setup
app.set("view engine", "ejs");

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: "Todo application" });
});

app.get('/signup', (req, res) => {
    res.render('signup', { title: "Signup" });
});

app.post('/users', async (req, res) => {
    try {
        const hashedPwd = await bcrypt.hash(req.body.password, saltRounds);
        const user = await User.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hashedPwd
        });
        req.login(user, (err) => {
            if (err) {
                console.log(err);
                return res.redirect('/signup');
            }
            res.redirect('/todos');
        });
    } catch (err) {
        console.log(err);
        res.redirect('/signup');
    }
});

app.get('/login', (req, res) => {
    res.render('login', { title: "Login" });
});

app.post('/session', passport.authenticate('local', {
    failureRedirect: "/login",
    failureMessage: "Invalid login credentials"
}), (req, res) => {
    res.redirect('/todos');
});

app.get('/signout', (req, res, next) => {
    req.logout(err => {
        if (err) { return next(err); }
        res.redirect("/");
    });
});

app.get('/todos', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    try {
        const loggedInUser = req.user.id;
        const overdue = await Todo.overdue(loggedInUser);
        const dueToday = await Todo.dueToday(loggedInUser);
        const dueLater = await Todo.dueLater(loggedInUser);
        const completed = await Todo.completed(loggedInUser); // Fetch completed todos

        if (req.accepts("html")) {
            res.render('todos', { overdue, dueToday, dueLater, completed });
        } else {
            res.json({ overdue, dueToday, dueLater, completed });
        }
    } catch (error) {
        console.error("Error fetching todos:", error);
        res.status(500).send("Error fetching todos");
    }
});

app.post('/todos', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    try {
        const todo = await Todo.create({
            title: req.body.title,
            dueDate: req.body.dueDate,
            completed: false,
            userId: req.user.id,
        });
        res.redirect("/todos");
    } catch (error) {
        console.error("Failed to create todo:", error);
        res.status(422).json({ error: "Failed to create todo" });
    }
});

app.put('/todos/:id/markAsCompleted', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    try {
        const todo = await Todo.findByPk(req.params.id);
        if (!todo) {
            return res.status(404).json({ error: "Todo not found" });
        }

        todo.completed = true;
        await todo.save();
        res.json(todo);
    } catch (error) {
        console.error("Failed to update todo:", error);
        res.status(422).json({ error: "Failed to update todo" });
    }
});

app.delete('/todos/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
    try {
        const result = await Todo.destroy({ where: { id: req.params.id, userId: req.user.id } });
        if (result === 0) {
            return res.status(404).json({ error: "Todo not found or unauthorized" });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting todo:", err);
        res.status(422).json(err);
    }
});

module.exports = app;