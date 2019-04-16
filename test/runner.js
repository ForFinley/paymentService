const {
  startDynamoLocal,
  createTables,
  createRecords,
  stopDynamoLocal
} = require("./dynamodbLocal.js");
const { registrationTests } = require("./registration/registration.test.js");
const { signInTests } = require("./signIn/signIn.test.js");
const { verifyEmailTests } = require("./verifyEmail/verifyEmail.test.js");
const {
  changePasswordTests
} = require("./changePassword/changePassword.test.js");
const { passwordResetTests } = require("./passwordReset/passwordReset.test.js");
const { changeEmailTests } = require("./changeEmail/changeEmail.test.js");

describe("** All Integrated Tests **", () => {
  before(async () => {
    startDynamoLocal();
    await createTables();
    await createRecords();
  });

  after(stopDynamoLocal);

  describe("Registration", () => {
    registrationTests();
  });

  describe("Sign In", () => {
    signInTests();
  });

  describe("Verify Email", () => {
    verifyEmailTests();
  });

  describe("Change Password", () => {
    changePasswordTests();
  });

  describe("Password Reset", () => {
    passwordResetTests();
  });

  describe("Change Email", () => {
    changeEmailTests();
  });
});
