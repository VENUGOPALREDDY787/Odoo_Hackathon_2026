const auditsService = require('./service');
const { createAuditCycleSchema, verifyItemSchema } = require('./validators');
const response = require('../../utils/response');

async function createCycle(req, res, next) {
  try {
    const validatedData = createAuditCycleSchema.parse(req.body);
    const data = await auditsService.createCycle(req.user.id, req.user.organizationId, validatedData);
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listCycles(req, res, next) {
  try {
    const data = await auditsService.listCycles(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function getCycle(req, res, next) {
  try {
    const data = await auditsService.getCycle(req.user.organizationId, req.params.id);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function startCycle(req, res, next) {
  try {
    const data = await auditsService.startCycle(req.user.id, req.user.organizationId, req.params.id);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function verifyItem(req, res, next) {
  try {
    const validatedData = verifyItemSchema.parse(req.body);
    const data = await auditsService.verifyItem(req.user.id, req.user.organizationId, req.params.itemId, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function closeCycle(req, res, next) {
  try {
    const data = await auditsService.closeCycle(req.user.id, req.user.organizationId, req.params.id);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCycle,
  listCycles,
  getCycle,
  startCycle,
  verifyItem,
  closeCycle
};
