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

/**
 * Converts a number given as string containing scientific
 * notation to regular number, e.g.:
 * 1.105898485e+22 to 11058984850000000000000
 *
 * @param {string} numberString
 * @returns {string}
 */
export function removeScientificNotationFromNumbString(numberString: string) {
    const numb = +numberString;
    const data = String(numb).split(/[eE]/);

    if (data.length == 1)
        return data[0];

    let z = "";
    const sign = numb < 0 ? "-" : "";
    const str = data[0].replace(".", "");
    let mag = Number(data[1]) + 1;

    if (mag < 0) {
        z = sign + "0.";
        while (mag++)
            z += "0";
        return z + str.replace(/^\-/, "");
    }
    mag -= str.length;
    while (mag--)
        z += "0";
    return str + z;
}