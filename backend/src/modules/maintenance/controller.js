const maintenanceService = require('./service');
const { createRequestSchema, approveRequestSchema, assignRequestSchema, updateProgressSchema } = require('./validators');
const response = require('../../utils/response');

async function createRequest(req, res, next) {
  try {
    const validatedData = createRequestSchema.parse(req.body);
    const data = await maintenanceService.createRequest(req.user.id, req.user.organizationId, validatedData);
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listRequests(req, res, next) {
  try {
    const data = await maintenanceService.listRequests(req.user.organizationId, req.query);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function approveRequest(req, res, next) {
  try {
    const validatedData = approveRequestSchema.parse(req.body);
    const data = await maintenanceService.approveRequest(req.user.id, req.user.organizationId, req.params.id, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function assignTechnician(req, res, next) {
  try {
    const validatedData = assignRequestSchema.parse(req.body);
    const data = await maintenanceService.assignTechnician(req.user.id, req.user.organizationId, req.params.id, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function updateProgress(req, res, next) {
  try {
    const validatedData = updateProgressSchema.parse(req.body);
    const data = await maintenanceService.updateProgress(req.user.id, req.user.organizationId, req.params.id, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRequest,
  listRequests,
  approveRequest,
  assignTechnician,
  updateProgress
};
