import AWS = require("aws-sdk");
const config = require("config");

const AWSconfig = config.get("AWS");

AWS.config.update({
  accessKeyId: AWSconfig.S3.ACCESSKEYID,
  secretAccessKey: AWSconfig.S3.SECRETACCESSKEY
});

export default new AWS.S3();