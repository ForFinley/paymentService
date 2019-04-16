const dynamodbLocal = require("dynamodb-localhost");
const { dynamodb, docClient } = require("../controllers/utils/dynamoSetup.js");
const { USER_TABLE } = require("../env.js");
const port = 8000;

exports.startDynamoLocal = () => {
  dynamodbLocal.install(() => {});
  dynamodbLocal.start({ port, inMemory: true });
};

exports.stopDynamoLocal = () => {
  dynamodbLocal.stop(port);
};

exports.createTables = async () => {
  const params = {
    AttributeDefinitions: [
      {
        AttributeName: "userId",
        AttributeType: "S"
      },
      {
        AttributeName: "email",
        AttributeType: "S"
      }
    ],
    KeySchema: [
      {
        AttributeName: "userId",
        KeyType: "HASH"
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: "email-index",
        KeySchema: [
          {
            AttributeName: "email",
            KeyType: "HASH"
          }
        ],
        Projection: {
          ProjectionType: "ALL"
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
        }
      }
    ],
    TableName: USER_TABLE
  };

  try {
    await dynamodb.createTable(params).promise();
    const tables = await dynamodb.listTables({}).promise();
    console.log("TABLE CREATED:", tables);
  } catch (e) {
    console.log(e);
  }
};

exports.createRecords = async () => {
  const {
    registerNewUserExistingEmail
  } = require("./registration/fixtures.js");
  const { signInUser } = require("./signIn/fixtures.js");
  const { verifyEmail } = require("./verifyEmail/fixtures.js");
  const { changePassword } = require("./changePassword/fixtures.js");
  const { resetPasswordConfirm } = require("./passwordReset/fixtures.js");
  const {
    changeEmailRecord,
    changeEmailInUseRecord
  } = require("./changeEmail/fixtures.js");

  const registerNewUserExistingEmailParams = {
    TableName: USER_TABLE,
    Item: {
      userId: registerNewUserExistingEmail.userId,
      email: registerNewUserExistingEmail.body.email,
      password: registerNewUserExistingEmail.body.password
    }
  };

  const signInUserRecord = {
    TableName: USER_TABLE,
    Item: {
      userId: signInUser.userId,
      email: signInUser.body.email,
      password: signInUser.encrytPassword,
      salt: signInUser.salt
    }
  };

  const verifyEmailParams = {
    TableName: USER_TABLE,
    Item: {
      userId: verifyEmail.userId,
      email: verifyEmail.email,
      emailVerified: false
    }
  };

  const changePasswordParams = {
    TableName: USER_TABLE,
    Item: {
      userId: changePassword.user.userId,
      password: changePassword.encryptPass,
      salt: changePassword.salt
    }
  };

  const resetPasswordConfirmParams = {
    TableName: USER_TABLE,
    Item: {
      userId: resetPasswordConfirm.userId,
      email: resetPasswordConfirm.email,
      password: resetPasswordConfirm.oldPassword,
      salt: resetPasswordConfirm.salt
    }
  };

  const changeEmailParams = {
    TableName: USER_TABLE,
    Item: {
      userId: changeEmailRecord.userId,
      email: changeEmailRecord.email
    }
  };
  const changeEmailInUseParams = {
    TableName: USER_TABLE,
    Item: {
      userId: changeEmailInUseRecord.userId,
      email: changeEmailInUseRecord.email
    }
  };

  const fixtureArray = [
    registerNewUserExistingEmailParams,
    signInUserRecord,
    verifyEmailParams,
    changePasswordParams,
    resetPasswordConfirmParams,
    changeEmailParams,
    changeEmailInUseParams
  ];
  await Promise.all(fixtureArray.map(param => docClient.put(param).promise()));
  console.log("TEST RECORDS CREATED");

  // let t = await docClient
  //   .scan({
  //     TableName: USER_TABLE
  //   })
  //   .promise();
  // console.log('HUR', t);
};

exports.userInDynamo = async userId => {
  const params = {
    TableName: USER_TABLE,
    Key: { userId }
  };
  const result = await docClient.get(params).promise();
  if (result.Item && result.Item.userId) return true;
  return false;
};

exports.getUser = async userId => {
  const params = {
    TableName: USER_TABLE,
    Key: { userId }
  };
  const result = await docClient.get(params).promise();
  if (result.Item && result.Item.userId) return result.Item;
  return false;
};
