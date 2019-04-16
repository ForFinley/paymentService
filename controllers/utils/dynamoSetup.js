const AWS = require("aws-sdk");
const { REGION } = require("../../env.js");

let config = {
  region: REGION || "us-east-1"
};
if (process.env.NODE_ENV === "TEST") {
  config = Object.assign(config, {
    endpoint: new AWS.Endpoint("http://localhost:8000"),
    accessKeyId: "accessKeyId",
    secretAccessKey: "secretAccessKey"
  });
}
AWS.config.update(config);

const docClient = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

// Used for creating and listing tables
const dynamodb = new AWS.DynamoDB();

module.exports = {
  AWS,
  docClient,
  dynamodb
};
