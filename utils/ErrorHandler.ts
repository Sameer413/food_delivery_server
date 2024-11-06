class ErrorHandler extends Error {
  statusCode: number;
  errors?: any[];
  stack?: string;
  data: any;
  success: boolean;

  constructor(
    message: string = "Something went wrong",
    statuCode: number,
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statuCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ErrorHandler;
