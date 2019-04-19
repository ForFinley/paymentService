const { STRIPE_SECRET_KEY } = require('../env.js');
const stripe = require('stripe')(STRIPE_SECRET_KEY);
module.exports = stripe;
