const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

  try {

    // Get authorization header
    const authHeader =
      req.headers.authorization;

    // Check if token exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Example:
    // Bearer eyJhbGciOiJIUzI1Ni...

    // Extract token
    const token =
      authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );
    console.log(decoded)

    // Save user info in request
    req.user = decoded;

    next();

  } catch (error) {

    console.log(error);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};