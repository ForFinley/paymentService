const jwt = require("jsonwebtoken");
const { accessKey } = require("./keys/privateKeys.js");
const {
  InvalidCredentialsError,
  resolveErrorSendResponse
} = require("./errors.js");

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodeToken = await jwt.verify(token, accessKey);

    req.user = {
      userId: decodeToken.userId,
      email: decodeToken.email,
      role: decodeToken.role
    };
    next();
  } catch (e) {
    resolveErrorSendResponse(new InvalidCredentialsError("Unauthorized"), res);
  }
};

exports.auth = async authorization => {
  try {
    const token = authorization;
    const decodeToken = await jwt.verify(token, accessKey);
    return {
      userId: decodeToken.userId,
      email: decodeToken.email,
      role: decodeToken.role
    };
  } catch (e) {
    return false;
  }
};
