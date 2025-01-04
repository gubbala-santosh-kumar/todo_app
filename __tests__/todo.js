const request = require('supertest');
const db = require('../models/index');
const app = require('../app');

let server, agent;

describe("Todo test suit", () => {
    beforeAll(async () => {
        await db.sequelize.sync({ force: true });
        server = app.listen(3000, () => {});
        agent = request.agent(server);
    });

    afterAll(async () => {
        await db.sequelize.close();
        server.close();
    });

    test("responds with json at /todos", async () => {
        const response = await agent.post("/todos").send({
            "title": "Buy Milk",
            "dueDate": new Date().toISOString(),
            "completed": false
        });

        expect(response.status).toBe(201);

        expect(response.header["content-type"]).toBe(
            "application/json; charset=utf-8"
        );

        const parsedResponse = JSON.parse(response.text);
        expect(parsedResponse.id).toBeDefined();
    });

    test("Mark a todo as complete", async () => {
        const response = await agent.post("/todos").send({
            title: "Buy Milk",
            dueDate: new Date().toISOString(),
            completed: false
        });
    
        const parsedResponse = JSON.parse(response.text); 
        const todoID = parsedResponse.id;
    
        expect(parsedResponse.completed).toBe(false);
    
        const markAsCompleteResponse = await agent.put(`/todos/${todoID}/markAsCompleted`).send();
        const parsedUpdateResponse = JSON.parse(markAsCompleteResponse.text);
    
        expect(parsedUpdateResponse.completed).toBe(true);
    });    
});
