const { USER_TABLE } = require('../env.js');
const { docClient } = require('./utils/dynamoSetup.js');
const { getUser } = require('./utils/database.js');
const stripe = require('./stripeInstance');
const {
  ValidationError,
  resolveErrorSendResponse
} = require('./utils/errors.js');

/**
 * Reference: https://stripe.com/docs/stripe-js < -- Get token
 * https://stripe.com/docs/api/sources/attach
 */

//check for token (that comes from stripe on the client request)
function validate(body, res) {
  if (!body.token) throw new ValidationError('MISSING_SOURCE_TOKEN');
  return true;
}

module.exports.handler = async (req, res) => {
  try {
    console.log('Starting function setBillingCard...');
    console.log('BODY', req.body);

    if (req.body === null || !validate(req.body, res)) {
      return;
    }

    const user = await getUser(req.user.userId);
    console.log('USER', user);

    let stripeInforesult;
    let card;
    let stripeRecord;
    let newCustomer = true;
    let newAddress = false;

    //New customer
    if (!user.stripe) {
      newAddress = true; //so address is added to dynamo

      const createCustomerParams = {
        email: req.user.email,
        source: req.body.token,
        description: req.user.userId,
        address: {
          line1: req.body.line1,
          city: req.body.city,
          country: req.body.country,
          line2: req.body.line2,
          postal_code: req.body.postalCode,
          state: req.body.state
        }
      };
      stripeInfo = await stripe.customers.create(createCustomerParams);
      console.log('HERE', stripeInfo);
      card = stripeInfo.sources.data[0];
      console.log('CARD', card);
      if (card.exp_month < 10) card.exp_month = '0' + card.exp_month;

      stripeRecord = {
        customerId: stripeInfo.id,
        card: {
          cardId: card.id,
          country: card.country,
          brand: card.brand,
          last4: card.last4,
          expirationDate: card.exp_month + '/' + card.exp_year
        },
        address: {
          line1: stripeInfo.address.line1,
          line2: stripeInfo.address.line2,
          city: stripeInfo.address.city,
          state: stripeInfo.address.state,
          postalCode: stripeInfo.address.postal_code,
          country: stripeInfo.address.country
        }
      };
    }
    //Existing customer, adds new card and updates address if different
    // else {
    //   result = await stripe.customers.createSource(stripeCustomerId, {
    //     source: req.body.token
    //   });
    //   card = result;
    //   newCustomer = false;
    // update stripe user address
    //   if (
    //     req.body.line1 !== req.user.billingAddressLine1 ||
    //     req.body.city !== req.user.billingAddressCity ||
    //     req.body.country !== req.user.billingAddressCountry ||
    //     req.body.line2 !== req.user.billingAddressLine2 ||
    //     req.body.postalCode !== req.user.billingAdddressPostalCode ||
    //     req.body.state !== req.user.billingAddressState
    //   ) {
    //     newAddress = true;

    //     let updateStripeParams = {
    //       //billing address
    //       shipping: {
    //         address: {
    //           line1: req.body.line1,
    //           city: req.body.city,
    //           country: req.body.country,
    //           line2: req.body.line2,
    //           postal_code: req.body.postalCode,
    //           state: req.body.state
    //         },
    //         name: 'billingAddress - ' + req.body.email
    //       }
    //     };
    //     await stripe.customers.update(
    //       req.user.stripeCustomerId,
    //       updateStripeParams
    //     );
    //   }
    // }

    const updateRequest = {
      TableName: USER_TABLE,
      Key: {
        userId: req.user.userId
      },
      UpdateExpression: 'set #stripe = :stripe',
      ExpressionAttributeNames: {
        '#stripe': 'stripe'
      },
      ExpressionAttributeValues: {
        ':stripe': stripeRecord
      },
      ReturnConsumedCapacity: 'TOTAL',
      ReturnValues: 'UPDATED_NEW'
    };

    console.log(updateRequest);
    //update the user in DB with relevant card info
    let updatedUser = await docClient.update(updateRequest).promise();
    console.log(updatedUser);
    return res.status(200).send({ message: 'CARD UPDATED' });
  } catch (e) {
    console.log(e);
    resolveErrorSendResponse(e, res);
  }
};
