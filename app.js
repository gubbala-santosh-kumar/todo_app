const express = require('express');
const { Todo } = require("./models"); 
const bodyParser = require('body-parser');
const path = require('path');
const { url } = require('inspector');

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({extended:false}));

app.set("view engine","ejs");

app.get('/', async(req,res)=>{
    const allTodos = await Todo.getTodos();
    const today = new Date().toISOString().split('T')[0];

    const overdue = allTodos.filter(todo => todo.dueDate < today);
    const dueToday = allTodos.filter(todo => todo.dueDate === today);
    const dueLater = allTodos.filter(todo => todo.dueDate > today);

    if (req.accepts("html")) {
        res.render('index', {
            allTodos,
            overdue,
            dueToday,
            dueLater
        });
    } else {
        res.json({ allTodos });
    }
})

app.use(express.static(path.join(__dirname,'public')));

// GET all todos
app.get('/todos', async (req, res) => {
    console.log("Todo list",req.body);
});

// POST a new todo
app.post('/todos', async (req, res) => {
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
app.put('/todos/:id/markAsCompleted', async (req, res) => {
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
app.delete('/todos/:id', async (req, res) => {
    console.log("Deleting Todo", req.params.id);

    try {
        const todo = await Todo.findByPk(req.params.id);
        if (!todo) {
            return res.status(404).json({ error: "Todo not found" });
        }

        await todo.destroy();
        return res.status(204).json({ message: "Todo deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(422).json({ error: "Failed to delete todo" });
    }
});

module.exports = app;
