const employeesService = require('./service');
const { updateRoleSchema, updateStatusSchema } = require('./validators');
const response = require('../../utils/response');

async function getMe(req, res, next) {
  try {
    const data = await employeesService.getMe(req.user.id);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listEmployees(req, res, next) {
  try {
    const data = await employeesService.listEmployees(req.user.organizationId, req.query);
    res.status(200).json(response.success(data.employees, data.pagination));
  } catch (error) {
    next(error);
  }
}

async function updateRole(req, res, next) {
  try {
    const validatedData = updateRoleSchema.parse(req.body);
    const data = await employeesService.updateRole(req.user.id, req.params.id, validatedData.role);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const validatedData = updateStatusSchema.parse(req.body);
    const data = await employeesService.updateStatus(req.user.id, req.params.id, validatedData.status);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMe,
  listEmployees,
  updateRole,
  updateStatus
};
