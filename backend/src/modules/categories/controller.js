const categoriesService = require('./service');
const { createCategorySchema, updateCategorySchema } = require('./validators');
const response = require('../../utils/response');

async function createCategory(req, res, next) {
  try {
    const validatedData = createCategorySchema.parse(req.body);
    const data = await categoriesService.createCategory(req.user.id, req.user.organizationId, validatedData);
    res.status(201).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function listCategories(req, res, next) {
  try {
    const data = await categoriesService.listCategories(req.user.organizationId);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const validatedData = updateCategorySchema.parse(req.body);
    const data = await categoriesService.updateCategory(req.user.id, req.user.organizationId, req.params.id, validatedData);
    res.status(200).json(response.success(data));
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await categoriesService.deleteCategory(req.user.id, req.user.organizationId, req.params.id);
    res.status(200).json(response.success({ message: 'Category deleted successfully' }));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory
};
