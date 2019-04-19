const express = require('express');
const router = express.Router();
const addFullUser = require('../controllers/utils/addFullUser.js');
const { authenticate } = require('../controllers/utils/jwt.js');

const setBillingCard = require('../controllers/setBillingCard.js');
const deleteBillingCard = require('../controllers/deleteBillingCard.js');
const charge = require('../controllers/charge.js');
const getUserBillingHistory = require('../controllers/getUserBillingHistory.js');

/**
 * paymentService/setBillingCard
 * Headers: authorization: <authorizationToken>
 * Body: token, line1, city, country, line2, postalCode, state
 * Takes in source token created on frontend from stripe and billing address of cardholder.
 * Creates a card in stripe and creates a new customer or assigns it to customer if they already exist, writes info to DB (userModel)
 */
router.post(
  '/setBillingCard',
  authenticate,
  addFullUser,
  setBillingCard.handler
);

/**
 * paymentService/deleteBillingCard
 * Headers: authorization: <authorizationToken>
 * Deletes a customer's card in stripe and DB (userModel)
 */
router.delete(
  '/deleteBillingCard',
  authenticate,
  addFullUser,
  deleteBillingCard.handler
);

/**
 * paymentService/charge
 * Headers: authorization: <authorizationToken>
 * Body: productId
 * Takes in productId and charges user for single product.
 * Creates and returns billing history record.
 */
router.post('/charge', authenticate, charge.handler);

/**
 * paymentService/userBillingHistory
 * Headers: authorization: <authorizationToken>
 * Querys all users billing history.
 */
router.get('/userBillingHistory', authenticate, getUserBillingHistory.handler);

/**
 * paymentService/healthCheck
 */
router.get('/healthCheck', (req, res) => {
  res.status(200).send({ message: 'HEALTHY' });
});

module.exports = router;
