const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION
});
const billingHistoryTable = process.env.BILLING_HISTORY_TABLE;

module.exports.handler = async function(req, res) {
  console.log("Starting function getUserBillingHistory...");
  console.log(req.user);

  try {
    let billingHistory = await docClient
      .query({
        TableName: billingHistoryTable,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": req.user.userId
        },
        ReturnConsumedCapacity: "TOTAL"
      })
      .promise();

    console.log(billingHistory);
    return res.status(200).send(billingHistory);
  } catch (err) {
    console.log("**ERROR**", err);
    return res.status(500).send("ERROR : Querying billing history failed.");
  }
};
