import { Device } from "../src/models/DeviceModel";
import { App } from "../src/App";
import * as mocha from "mocha";
const chai = require("chai");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const should = chai.should();
const app = new App().app;


describe("Register device", () => {
    beforeEach((done) => {
        Device.remove({}, () => {
            done();
        });
    });

    afterEach((done) => {
        Device.remove({}, () => {
            done();
        });
    });

    const deviceID = "B14BD907-324A-4A40-98A1-A255CC6D2BE5";
    const token = "451adb42d54498d9554b4b11a749cac665558707fb488a2cf06cc259336c7db2";
    const androidToken = "APA91bH0ZGg9AkEcnZMLUarIuT6MkvLkNB0bzGw6n6GCCZIzW8R374ocf9iMVAvVHi"
    const address = "0xc344e083393ec50bf36be81b8995b0f2aa2c5716";

    it("Should register ios device", done => {
        const device = {
            deviceID,
            token,
            wallets: [address],
          }

        chai.request(app)
            .post("/push/register")
            .send(device)
            .end((err, res) => {
                const body = res.body;
                res.should.have.status(200);
                body.should.be.a("object");
                body.should.have.property("status").eql(200);
                body.should.have.property("message").eql("Successfully saved");
                body.should.have.property("response");

                const response = res.body.response;
                response.should.not.have.property("_id")
                response.should.have.property("wallets").eql([address]);
                response.should.have.property("preferences");
                response.preferences.should.have.property("isAirdrop")
                response.should.have.property("deviceID").eql(deviceID);
                response.should.have.property("createdAt").to.be.a("string");
                response.should.have.property("createdAt").to.be.a("string");
                response.should.have.property("token").eql(token);
                response.should.have.property("type").to.be.a("string")
                done();
            });
    })

    it("Should register android device", done => {
        const device = {
            deviceID: "",
            token: androidToken,
            wallets: [address],
            type: "android"
          }

          chai.request(app)
            .post("/push/register")
            .send(device)
            .end((err, res) => {
                const body = res.body;
                res.should.have.status(200);
                body.should.be.a("object");
                body.should.have.property("status").eql(200);
                body.should.have.property("message").eql("Successfully saved");
                body.should.have.property("response");

                const response = res.body.response;
                response.should.not.have.property("_id")
                response.should.have.property("wallets").eql([address]);
                response.should.have.property("preferences");
                response.preferences.should.have.property("isAirdrop")
                response.should.have.property("deviceID").eql("");
                response.should.have.property("createdAt").to.be.a("string");
                response.should.have.property("createdAt").to.be.a("string");
                response.should.have.property("token").eql(androidToken);
                response.should.have.property("type").to.be.a("string").and.to.be.eql("android")
                done();
            });
    })

    it("Should unregister ios device", () => {
        const device = {
            deviceID,
            token,
            wallets: [address],
          }

          chai.request(app)
            .post("/push/register")
            .send(device)
            .end((err, res) => {
            })

          chai.request(app)
            .delete("/push/unregister")
            .send(device)
            .end((err, res) => {
                const body = res.body
                res.should.have.status(200)
                res.should.not.have.property("_id")
                body.should.have.property("message").eql("Successfully unregistered")
            })
    });

    it("Should unregister android device", () => {
        const device = {
            deviceID: "",
            token: androidToken,
            wallets: [address],
            type: "android"
          }

          chai.request(app)
            .post("/push/register")
            .send(device)
            .end((err, res) => {
            })

          chai.request(app)
            .delete("/push/unregister")
            .send(device)
            .end((err, res) => {
                const body = res.body
                res.should.have.status(200)
                res.should.not.have.property("_id")
                body.should.have.property("message").eql("Successfully unregistered")
            })
    });

    it("Should register only one wallet if dublicates present", done => {
        const device = {
            deviceID,
            token,
            wallets: [address, address],
          }

        chai.request(app)
            .post("/push/register")
            .send(device)
            .end((err, res) => {
                const response = res.body.response;
                response.should.have.property("wallets").eql([address]);
                done();
            });
    })
})
