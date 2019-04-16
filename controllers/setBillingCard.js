const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION
});
const stripe = require("./stripeInstance");
const httpUtil = require("../utils/httpUtil.js");
const userTable = process.env.USER_TABLE;

/**
 * Reference: https://stripe.com/docs/sources/results
 * https://stripe.com/docs/api/sources/attach
 */

//check for token (that comes from stripe on the client request)
function validate(body, res) {
  if (!body.token) {
    res
      .status(400)
      .send(httpUtil.createResponse(400, "ERROR : Missing source (token)."));
    return false;
  }
  return true;
}

module.exports.handler = async function(req, res) {
  console.log("Starting function setBillingCard...");
  console.log(req.body);

  if (req.body === null || !validate(req.body, res)) {
    return;
  }

  try {
    const { stripeCustomerId } = req.user;
    let result;
    let card;
    let newCustomer = true;
    let newAddress = false;

    //New customer
    if (!stripeCustomerId) {
      newAddress = true; //so address is added to dynamo
      let params = {
        email: req.user.email,
        source: req.body.token,
        //billing address
        shipping: {
          address: {
            line1: req.body.line1,
            city: req.body.city,
            country: req.body.country,
            line2: req.body.line2,
            postal_code: req.body.postalCode,
            state: req.body.state
          },
          name: "billingAddress - " + req.body.email
        }
      };
      result = await stripe.customers.create(params);
      if (
        result &&
        result.sources &&
        result.sources.data &&
        result.sources.data.length
      ) {
        card = result.sources.data[0];
      } else {
        return res
          .status(422)
          .send(
            httpUtil.createResponse(
              422,
              "ERROR :  Unable to add credit card to account."
            )
          );
      }
    }
    //Existing customer, adds new card and updates address if different
    else {
      result = await stripe.customers.createSource(stripeCustomerId, {
        source: req.body.token
      });
      card = result;
      newCustomer = false;
      // update stripe user address
      if (
        req.body.line1 !== req.user.billingAddressLine1 ||
        req.body.city !== req.user.billingAddressCity ||
        req.body.country !== req.user.billingAddressCountry ||
        req.body.line2 !== req.user.billingAddressLine2 ||
        req.body.postalCode !== req.user.billingAdddressPostalCode ||
        req.body.state !== req.user.billingAddressState
      ) {
        newAddress = true;

        let updateStripeParams = {
          //billing address
          shipping: {
            address: {
              line1: req.body.line1,
              city: req.body.city,
              country: req.body.country,
              line2: req.body.line2,
              postal_code: req.body.postalCode,
              state: req.body.state
            },
            name: "billingAddress - " + req.body.email
          }
        };
        await stripe.customers.update(
          req.user.stripeCustomerId,
          updateStripeParams
        );
      }
    }

    if (card.exp_month < 10) card.exp_month = "0" + card.exp_month;

    let updateExpression =
      "set #stripeBillingCardBrand = :stripeBillingCardBrand, #stripeBillingCardExp = :stripeBillingCardExp";
    updateExpression +=
      ", #stripeBillingCardLast4 = :stripeBillingCardLast4, #stripeCardId = :stripeCardId";

    // if (newAddress === true) {
    updateExpression +=
      ", #billingAddressLine1 = :billingAddressLine1, #billingAddressCity = :billingAddressCity";
    updateExpression +=
      ", #billingAddressCountry = :billingAddressCountry, #billingAddressLine2 = :billingAddressLine2";
    updateExpression +=
      ", #billingAdddressPostalCode = :billingAdddressPostalCode, #billingAddressState = :billingAddressState";
    // }

    if (newCustomer === true)
      updateExpression += ", #stripeCustomerId = :stripeCustomerId";

    let updateRequest = {
      TableName: userTable,
      Key: {
        userId: req.user.userId
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        "#stripeBillingCardBrand": "stripeBillingCardBrand",
        "#stripeBillingCardExp": "stripeBillingCardExp",
        "#stripeBillingCardLast4": "stripeBillingCardLast4",
        "#stripeCustomerId": "stripeCustomerId",
        "#stripeCardId": "stripeCardId",
        "#billingAddressLine1": "billingAddressLine1",
        "#billingAddressCity": "billingAddressCity",
        "#billingAddressCountry": "billingAddressCountry",
        "#billingAddressLine2": "billingAddressLine2",
        "#billingAdddressPostalCode": "billingAdddressPostalCode",
        "#billingAddressState": "billingAddressState"
      },
      ExpressionAttributeValues: {
        ":stripeBillingCardBrand": card.brand,
        ":stripeBillingCardExp": card.exp_month + "/" + card.exp_year,
        ":stripeBillingCardLast4": card.last4,
        ":stripeCustomerId": result.id,
        ":stripeCardId": card.id,
        ":billingAddressLine1": req.body.line1 || " ",
        ":billingAddressCity": req.body.city || " ",
        ":billingAddressCountry": req.body.country || " ",
        ":billingAddressLine2": req.body.line2 || " ",
        ":billingAdddressPostalCode": req.body.postalCode || " ",
        ":billingAddressState": req.body.state || " "
      },
      ReturnConsumedCapacity: "TOTAL",
      ReturnValues: "UPDATED_NEW"
    };

    if (newCustomer === false) {
      delete updateRequest.ExpressionAttributeNames["#stripeCustomerId"];
      delete updateRequest.ExpressionAttributeValues[":stripeCustomerId"];
    } else if (newAddress === false) {
      delete updateRequest.ExpressionAttributeNames["#billingAddressLine1"];
      delete updateRequest.ExpressionAttributeValues[":billingAddressLine1"];

      delete updateRequest.ExpressionAttributeNames["#billingAddressCity"];
      delete updateRequest.ExpressionAttributeValues[":billingAddressCity"];

      delete updateRequest.ExpressionAttributeNames["#billingAddressCountry"];
      delete updateRequest.ExpressionAttributeValues[":billingAddressCountry"];

      delete updateRequest.ExpressionAttributeNames["#billingAddressLine2"];
      delete updateRequest.ExpressionAttributeValues[":billingAddressLine2"];

      delete updateRequest.ExpressionAttributeNames[
        "#billingAdddressPostalCode"
      ];
      delete updateRequest.ExpressionAttributeValues[
        ":billingAdddressPostalCode"
      ];

      delete updateRequest.ExpressionAttributeNames["#billingAddressState"];
      delete updateRequest.ExpressionAttributeValues[":billingAddressState"];
    }

    try {
      console.log(updateRequest);
      //update the user in DB with relevant card info
      let updatedUser = await docClient.update(updateRequest).promise();
      //Checks to see if update worked
      if (updatedUser.Attributes.stripeCardId === card.id) {
        return res
          .status(200)
          .send(httpUtil.createResponse(200, "SUCCESS : Card added."));
      } else {
        console.log("**ERROR** Dynamo update failed.");
        return res
          .status(500)
          .send(httpUtil.createResponse(500, "ERROR : Adding card failed."));
      }
    } catch (err) {
      console.log("**ERROR** Couldn't update user in DB.**", err);
      return res
        .status(500)
        .send(
          httpUtil.createResponse(500, "ERROR : Couldn't update user in DB.")
        );
    }
  } catch (err) {
    console.log("**ERROR** Issue with stripe result.** ", err);
    return res
      .status(500)
      .send(httpUtil.createResponse(500, "ERROR :  Issue with stripe result."));
  }
};
