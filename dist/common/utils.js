"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fills the status and JSOn data into a response object.
 * @param res response object
 * @param status of the response
 * @param content of the response
 */
function sendJSONresponse(res, status, content) {
    res.status(status);
    res.json(content);
}
exports.sendJSONresponse = sendJSONresponse;
//# sourceMappingURL=utils.js.map