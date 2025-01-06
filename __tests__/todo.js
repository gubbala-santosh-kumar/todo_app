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

    test("Sign up",async()=>{
        let res = await agent.get("/signup");
        res = await agent.post("/users").send({
            firstName: "Test",
            lastName: "User A",
            email: "user@test.com",
        });
        expect(res.statusCode).toBe(302);
    });

    test("create a new todo",async()=>{
        const res = await agent.post("/todos").send({
            title: "Test Todo",
            dueDate: new Date().toISOString(),
            completed:false,
        });
        expect(res.statusCode).toBe(302);
    });
});
