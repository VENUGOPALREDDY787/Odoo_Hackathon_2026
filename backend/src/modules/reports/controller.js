const reportsService = require('./service');
const response = require('../../utils/response');

async function getDashboardKpi(req, res, next) {
  try {
    const data = await reportsService.getDashboardKpi(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function getAssetUtilization(req, res, next) {
  try {
    const data = await reportsService.getAssetUtilization(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function getMaintenanceFrequency(req, res, next) {
  try {
    const data = await reportsService.getMaintenanceFrequency(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function getRetirementDue(req, res, next) {
  try {
    const data = await reportsService.getRetirementDue(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function getDepartmentAllocations(req, res, next) {
  try {
    const data = await reportsService.getDepartmentAllocations(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function getBookingHeatmap(req, res, next) {
  try {
    const data = await reportsService.getBookingHeatmap(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardKpi,
  getAssetUtilization,
  getMaintenanceFrequency,
  getRetirementDue,
  getDepartmentAllocations,
  getBookingHeatmap
};
