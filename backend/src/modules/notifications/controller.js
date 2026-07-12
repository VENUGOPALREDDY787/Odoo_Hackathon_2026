const notificationsService = require('./service');
const response = require('../../utils/response');

async function listNotifications(req, res, next) {
  try {
    const data = await notificationsService.listNotifications(req.user.id, req.user.organizationId, req.query);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const data = await notificationsService.markAsRead(req.user.id, req.params.id);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationsService.markAllAsRead(req.user.id, req.user.organizationId);
    res.status(200).json(response.success({ message: 'All notifications marked as read' }));
  } catch (error) {
    next(error);
  }
}

async function listActivityLogs(req, res, next) {
  try {
    const data = await notificationsService.listActivityLogs(req.user.organizationId, req.query);
    res.status(200).json(response.success(data.logs, data.pagination));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  listActivityLogs
};
