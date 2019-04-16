const express = require("express");
const router = express.Router();
const expressJwt = require("express-jwt");
const secret = require("../controllers/utils/keys/privateKey.js");
const authenticate = expressJwt({ secret: secret.key });
const addFullUser = require("../controllers/utils/addFullUser.js");

const setBillingCard = require("../controllers/payment/setBillingCard.js");
const deleteBillingCard = require("../controllers/payment/deleteBillingCard.js");
const charge = require("../controllers/payment/charge.js");
const getUserBillingHistory = require("../controllers/payment/getUserBillingHistory.js");

/**
 * payment/setBillingCard
 * Headers: authorization: Bearer <Token>
 * Body: token, line1, city, country, line2, postalCode, state
 * Takes in source token created on frontend from stripe and billing address of cardholder.
 * Creates a card in stripe and creates a new customer or assigns it to customer if they already exist, writes info to DB (userModel)
 */
router.post(
  "/setBillingCard",
  authenticate,
  addFullUser,
  setBillingCard.handler
);

/**
 * payment/deleteBillingCard
 * Headers: authorization: Bearer <Token>
 * Deletes a customer's card in stripe and DB (userModel)
 */
router.get(
  "/deleteBillingCard",
  authenticate,
  addFullUser,
  deleteBillingCard.handler
);

/**
 * payment/charge
 * Headers: authorization: Bearer <Token>
 * Body: productId
 * Takes in productId and charges user for single product.
 * Creates and returns billing history record.
 */
router.post("/charge", authenticate, charge.handler);

/**
 * payment/userBillingHistory
 * Headers: authorization: Bearer <Token>
 * Querys all users billing history.
 */
router.get("/userBillingHistory", authenticate, getUserBillingHistory.handler);

module.exports = router;
