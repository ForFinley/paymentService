const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient({
  region: process.env.REGION
});
const uuidv1 = require("uuid/v1");
const stripe = require("./stripeInstance");
const httpUtil = require("../utils/httpUtil.js");
const userTable = process.env.USER_TABLE;
const productTable = process.env.PRODUCT_TABLE;
const billingHistoryTable = process.env.BILLING_HISTORY_TABLE;

function validate(body, res) {
  if (!body.productId) {
    res
      .status(400)
      .send(httpUtil.createResponse(400, "ERROR : Missing productId."));
    return false;
  }
  return true;
}

module.exports.handler = async function(req, res) {
  console.log("Starting function charge...");
  console.log(req.user);

  if (req.body === null || !validate(req.body, res)) {
    return;
  }
  try {
    //Need to get these to run parallel
    let user = await docClient
      .get({
        TableName: userTable,
        Key: {
          userId: req.user.userId
        },
        ReturnConsumedCapacity: "TOTAL"
      })
      .promise();

    let product = await docClient
      .get({
        TableName: productTable,
        Key: {
          productId: req.body.productId
        },
        ReturnConsumedCapacity: "TOTAL"
      })
      .promise();

    let chargeParams = {
      amount: product.Item.price * 100,
      currency: product.Item.currency,
      customer: user.Item.stripeCustomerId
    };
    const chargeInfo = await stripe.charges.create(chargeParams);

    let billingHistoryRecord = await setBillingHistory(
      user.Item,
      product.Item,
      chargeInfo
    );

    if (billingHistoryRecord) {
      return res
        .status(200)
        .send(httpUtil.createResponse(200, billingHistoryRecord.Item));
    } else throw "Adding billing record failed, user may have been charged.";
  } catch (e) {
    console.log("**ERROR** ", e);
    if (e.raw && e.raw.code === "missing") {
      return res.status(500).send("ERROR : Charge failed, no card on file.");
    }
    return res.status(500).send(httpUtil.createResponse(500, "ERROR :" + e));
  }
};

async function setBillingHistory(user, product, chargeInfo) {
  //Converts to string UTC date
  let transactionDate = new Date(chargeInfo.created * 1000).toISOString();
  let billingHistoryId = uuidv1();
  let params = {
    Item: {
      billingHistoryId: billingHistoryId,
      userId: user.userId,
      productId: product.productId,
      stripeChargeId: chargeInfo.id,
      price: product.price,
      currency: product.currency,
      transactionDate: transactionDate,
      paymentHandler: "STRIPE",
      cardBrand: user.stripeBillingCardBrand,
      cardLastFour: user.stripeBillingCardLast4,
      cardExpiration: user.stripeBillingCardExp,
      billingAddressLine1: user.billingAddressLine1,
      billingAddressCity: user.billingAddressCity,
      billingAddressCountry: user.billingAddressCountry,
      billingAddressLine2: user.billingAddressLine2,
      billingAdddressPostalCode: user.billingAdddressPostalCode,
      billingAddressState: user.billingAddressState,
      paymentChargeType: chargeInfo.object.toUpperCase()
    },
    ReturnConsumedCapacity: "TOTAL",
    TableName: billingHistoryTable
  };
  try {
    await docClient.put(params).promise();
    return await docClient
      .get({
        TableName: billingHistoryTable,
        Key: {
          userId: user.userId,
          billingHistoryId: billingHistoryId
        },
        ReturnConsumedCapacity: "TOTAL"
      })
      .promise();
  } catch (e) {
    console.log("**ERROR** With dynamo:", e);
    return;
  }
}

/*
chargeInfo:
{ id: 'ch_1DryYSJlYBbOBpxRfsFza9Gr',
  object: 'charge',
  amount: 1000,
  amount_refunded: 0,
  application: null,
  application_fee: null,
  application_fee_amount: null,
  balance_transaction: 'txn_1DryYSJlYBbOBpxRcvzAuNJH',
  captured: true,
  created: 1547345908,
  currency: 'usd',
  customer: 'cus_EKdDEHoX5azVBW',
  description: null,
  destination: null,
  dispute: null,
  failure_code: null,
  failure_message: null,
  fraud_details: {},
  invoice: null,
  livemode: false,
  metadata: {},
  on_behalf_of: null,
  order: null,
  outcome:
   { network_status: 'approved_by_network',
     reason: null,
     risk_level: 'normal',
     risk_score: 49,
     seller_message: 'Payment complete.',
     type: 'authorized' },
  paid: true,
  payment_intent: null,
  receipt_email: null,
  receipt_number: null,
  refunded: false,
  refunds:
   { object: 'list',
     data: [],
     has_more: false,
     total_count: 0,
     url: '/v1/charges/ch_1DryYSJlYBbOBpxRfsFza9Gr/refunds' },
  review: null,
  billing: null,
  source:
   { id: 'card_1DryYMJlYBbOBpxRj6k4IlUD',
     object: 'card',
     address_city: null,
     address_country: null,
     address_line1: null,
     address_line1_check: null,
     address_line2: null,
     address_state: null,
     address_zip: '42424',
     address_zip_check: 'pass',
     brand: 'Visa',
     country: 'US',
     customer: 'cus_EKdDEHoX5azVBW',
     cvc_check: 'pass',
     dynamic_last4: null,
     exp_month: 4,
     exp_year: 2024,
     fingerprint: '1Elseq7UpDr2cXEt',
     funding: 'credit',
     last4: '4242',
     metadata: {},
     name: null,
     tokenization_method: null },
  source_transfer: null,
  statement_descriptor: null,
  status: 'succeeded',
  transfer_data: null,
  transfer_group: null }
  */
