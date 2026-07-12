const allocationsService = require('./service');
const { createAllocationSchema, returnAllocationSchema, createTransferSchema, actionTransferSchema } = require('./validators');
const response = require('../../utils/response');

async function allocateAsset(req, res, next) {
  try {
    const validatedData = createAllocationSchema.parse(req.body);
    const data = await allocationsService.allocateAsset(req.user.id, req.user.organizationId, validatedData);
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function returnAsset(req, res, next) {
  try {
    const validatedData = returnAllocationSchema.parse(req.body);
    const data = await allocationsService.returnAsset(req.user.id, req.user.organizationId, req.params.id, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function requestTransfer(req, res, next) {
  try {
    const validatedData = createTransferSchema.parse(req.body);
    const data = await allocationsService.requestTransfer(req.user.id, req.user.organizationId, validatedData);
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listTransfers(req, res, next) {
  try {
    const data = await allocationsService.listTransfers(req.user.organizationId, req.query);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function processTransfer(req, res, next) {
  try {
    const validatedData = actionTransferSchema.parse(req.body);
    const data = await allocationsService.processTransfer(
      req.user.id,
      req.user.organizationId,
      req.user.role,
      req.params.id,
      validatedData
    );
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  allocateAsset,
  returnAsset,
  requestTransfer,
  listTransfers,
  processTransfer
};
