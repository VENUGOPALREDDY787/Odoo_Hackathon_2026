const departmentsService = require('./service');
const { createDepartmentSchema, updateDepartmentSchema } = require('./validators');
const response = require('../../utils/response');

async function createDepartment(req, res, next) {
  try {
    const validatedData = createDepartmentSchema.parse(req.body);
    const data = await departmentsService.createDepartment(req.user.id, req.user.organizationId, validatedData);
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listDepartments(req, res, next) {
  try {
    const data = await departmentsService.listDepartments(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function updateDepartment(req, res, next) {
  try {
    const validatedData = updateDepartmentSchema.parse(req.body);
    const data = await departmentsService.updateDepartment(req.user.id, req.user.organizationId, req.params.id, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function deleteDepartment(req, res, next) {
  try {
    await departmentsService.deleteDepartment(req.user.id, req.user.organizationId, req.params.id);
    res.status(200).json(response.success({ message: 'Department deleted successfully' }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createDepartment,
  listDepartments,
  updateDepartment,
  deleteDepartment
};
