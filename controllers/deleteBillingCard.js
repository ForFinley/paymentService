const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION
});
const stripe = require("./stripeInstance");
const httpUtil = require("../utils/httpUtil.js");
const userTable = process.env.USER_TABLE;

/**
 * Reference: https://stripe.com/docs/api/sources/detach
 */

module.exports.handler = async function(req, res) {
  console.log("Starting function deleteBillingCard...");
  console.log(req.user);

  const { stripeCustomerId } = req.user;
  if (!stripeCustomerId && !stripeCardId) {
    return res
      .status(500)
      .send(
        httpUtil.createResponse(
          400,
          "ERROR : User has no card on file, can't delete."
        )
      );
  }

  try {
    const result = await stripe.customers.deleteSource(
      req.user.stripeCustomerId,
      req.user.stripeCardId
    );
    console.log(result);

    let updateRequest = {
      TableName: userTable,
      Key: {
        userId: req.user.userId
      },
      UpdateExpression:
        "remove #stripeBillingCardBrand, #stripeBillingCardExp,#stripeBillingCardLast4, #stripeCardId",
      ExpressionAttributeNames: {
        "#stripeBillingCardBrand": "stripeBillingCardBrand",
        "#stripeBillingCardExp": "stripeBillingCardExp",
        "#stripeBillingCardLast4": "stripeBillingCardLast4",
        "#stripeCardId": "stripeCardId"
      },
      ReturnConsumedCapacity: "TOTAL",
      ReturnValues: "UPDATED_NEW"
    };

    //update the user in DB with relevant card info
    docClient.update(updateRequest).promise();
    return res
      .status(200)
      .send(httpUtil.createResponse(200, "SUCCESS : Card deleted."));
  } catch (err) {
    console.log(
      "**ERROR** A problem occurred while attempting to delete card.**",
      err
    );
    return res
      .status(500)
      .send(
        httpUtil.createResponse(
          500,
          "ERROR :  A problem occurred while attempting to delete card."
        )
      );
  }
};
