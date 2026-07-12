const assetsService = require('./service');
const { createAssetSchema, updateAssetSchema } = require('./validators');
const response = require('../../utils/response');

async function createAsset(req, res, next) {
  try {
    const validatedData = createAssetSchema.parse(req.body);
    const data = await assetsService.createAsset(req.user.id, req.user.organizationId, validatedData);
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listAssets(req, res, next) {
  try {
    const data = await assetsService.listAssets(req.user.organizationId, req.query);
    res.status(200).json(response.success(data.assets, data.pagination));
  } catch (error) {
    next(error);
  }
}

async function getAsset(req, res, next) {
  try {
    const data = await assetsService.getAsset(req.user.organizationId, req.params.id);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function updateAsset(req, res, next) {
  try {
    const validatedData = updateAssetSchema.parse(req.body);
    const data = await assetsService.updateAsset(req.user.id, req.user.organizationId, req.params.id, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function deleteAsset(req, res, next) {
  try {
    await assetsService.deleteAsset(req.user.id, req.user.organizationId, req.params.id);
    res.status(200).json(response.success({ message: 'Asset deleted successfully' }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAsset,
  listAssets,
  getAsset,
  updateAsset,
  deleteAsset
};
