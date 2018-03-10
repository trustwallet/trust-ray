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
        Device.remove({}, err => {
            done();
        });
    });

    afterEach((done) => {
        Device.remove({}, err => {
            done();
        });
    });

    const deviceID = "B14BD907-324A-4A40-98A1-A255CC6D2BE5";
    const token = "451adb42d54498d9554b4b11a749cac665558707fb488a2cf06cc259336c7db2";
    const address = "0xc344e083393ec50bf36be81b8995b0f2aa2c5716";

    it("Should register device", done => {
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
                response.should.have.property("wallets").eql([address]);
                response.should.have.property("preferences");
                response.preferences.should.have.property("isAirdrop")
                response.should.have.property("deviceID").eql(deviceID);
                response.should.have.property("createdAt").to.be.a("string");
                response.should.have.property("createdAt").to.be.a("string");
                response.should.have.property("token").eql(token);
                done();
            });
    })

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
