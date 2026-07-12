const authService = require('./service');
const { signupSchema, loginSchema, refreshSchema } = require('./validators');
const response = require('../../utils/response');

async function signup(req, res, next) {
  try {
    const validatedData = signupSchema.parse(req.body);
    const user = await authService.signup(validatedData);
    res.status(201).json(response.success(user));
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const data = await authService.login(validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const validatedData = refreshSchema.parse(req.body);
    const data = await authService.refresh(validatedData.refreshToken);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id);
    res.status(200).json(response.success({ message: 'Logged out successfully' }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout
};
