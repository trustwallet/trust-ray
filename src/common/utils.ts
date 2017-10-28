import { Response } from "express";

/**
 * Fills the status and JSOn data into a response object.
 * @param res response object
 * @param status of the response
 * @param content of the response
 */
export function sendJSONresponse(res: Response, status: number, content: any) {
    res.status(status);
    res.json(content);
}