const { docClient } = require("./dynamoSetup.js");
const { USER_TABLE, REFRESH_TABLE } = require("../../env.js");

exports.queryUserByEmail = async email => {
  const params = {
    TableName: USER_TABLE,
    IndexName: "email-index",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email
    },
    ReturnConsumedCapacity: "TOTAL"
  };
  const users = await docClient.query(params).promise();
  if (users.Items[0]) return users.Items[0];
  return false;
};

exports.getUser = async userId => {
  const params = {
    TableName: USER_TABLE,
    Key: {
      userId
    },
    ReturnConsumedCapacity: "TOTAL"
  };
  const user = await docClient.get(params).promise();
  if (user.Item) return user.Item;
  return false;
};

exports.putUser = async Item => {
  const params = {
    TableName: USER_TABLE,
    Item
  };
  return docClient.put(params).promise();
};

exports.userEmailVerified = async userId => {
  const params = {
    TableName: USER_TABLE,
    Key: {
      userId: userId
    },
    UpdateExpression: "set #emailVerified = :emailVerified",
    ExpressionAttributeNames: {
      "#emailVerified": "emailVerified"
    },
    ExpressionAttributeValues: {
      ":emailVerified": true
    },
    ReturnConsumedCapacity: "TOTAL",
    ReturnValues: "UPDATED_NEW"
  };
  return docClient.update(params).promise();
};

exports.updatePassword = async (userId, passwordResult) => {
  if (!passwordResult.encryptPass || !passwordResult.salt) return false;
  const params = {
    TableName: USER_TABLE,
    Key: {
      userId: userId
    },
    UpdateExpression:
      "set #password = :password, #salt = :salt, #updateDate = :updateDate",
    ExpressionAttributeNames: {
      "#password": "password",
      "#salt": "salt",
      "#updateDate": "updateDate"
    },
    ExpressionAttributeValues: {
      ":password": passwordResult.encryptPass,
      ":salt": passwordResult.salt,
      ":updateDate": new Date().toISOString()
    },
    ReturnConsumedCapacity: "TOTAL",
    ReturnValues: "UPDATED_NEW"
  };
  return docClient.update(params).promise();
};

exports.updateEmail = async (userId, email) => {
  const params = {
    TableName: USER_TABLE,
    Key: {
      userId: userId
    },
    UpdateExpression:
      "set #email = :email, #emailVerified = :emailVerified, #updateDate = :updateDate",
    ExpressionAttributeNames: {
      "#email": "email",
      "#emailVerified": "emailVerified",
      "#updateDate": "updateDate"
    },
    ExpressionAttributeValues: {
      ":email": email,
      ":emailVerified": false,
      ":updateDate": new Date().toISOString()
    },
    ReturnConsumedCapacity: "TOTAL",
    ReturnValues: "UPDATED_NEW"
  };
  return docClient.update(params).promise();
};

exports.putRefresh = async Item => {
  const params = {
    TableName: REFRESH_TABLE,
    Item
  };
  return docClient.put(params).promise();
};

exports.getRefresh = async refreshToken => {
  const params = {
    TableName: REFRESH_TABLE,
    Key: {
      refreshToken
    },
    ReturnConsumedCapacity: "TOTAL"
  };
  const token = await docClient.get(params).promise();
  if (token.Item) return token.Item;
  return false;
};

exports.deleteRefreshRecord = async refreshToken => {
  const params = {
    TableName: REFRESH_TABLE,
    Key: {
      refreshToken
    }
  };
  return await docClient.delete(params).promise();
};
