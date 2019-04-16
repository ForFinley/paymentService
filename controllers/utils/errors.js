class InvalidCredentialsError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 401;
    this.message = message;
  }
}

class ResourceExistsError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 409;
    this.message = message;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 400;
    this.message = message;
  }
}

class ResourceNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = 404;
    this.message = message;
  }
}

const resolveErrorSendResponse = (e, res) => {
  if (e.statusCode) {
    res.status(e.statusCode).send({
      message: e.message
    });
  } else {
    console.log(e);
    res.status(500).send({
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  InvalidCredentialsError,
  ResourceExistsError,
  ValidationError,
  ResourceNotFoundError,
  resolveErrorSendResponse
};
