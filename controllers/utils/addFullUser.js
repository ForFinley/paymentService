const { docClient } = require('./dynamoSetup.js');
const { USER_TABLE } = require('../../env.js');

//this middleware meant to go after 'authenticate' middleware
//so req.userId is already defined
module.exports = async (req, res, next) => {
  console.log('Starting function addFullUser...');
  console.log(req.user);

  if (!req.user.userId) {
    return res.status(500).send('No user _id provided');
  }
  try {
    let userFromDB = await docClient
      .get({
        TableName: USER_TABLE,
        Key: {
          userId: req.user.userId
        },
        ReturnConsumedCapacity: 'TOTAL'
      })
      .promise();

    //add full user to req.user
    req.user = userFromDB.Item;
    return next();
  } catch (e) {
    return res
      .status(500)
      .send({ error: e, message: 'An error occurred finding user' });
  }
};
