const express = require('express');
const router = express.Router();
const categoriesController = require('./controller');
const { authenticate, requireRole } = require('../../middleware/auth');

// Public listing for authenticated employees
router.get('/', authenticate, categoriesController.listCategories);

// Category modifications (Admin only)
router.post('/', authenticate, requireRole(['Admin']), categoriesController.createCategory);
router.put('/:id', authenticate, requireRole(['Admin']), categoriesController.updateCategory);
router.delete('/:id', authenticate, requireRole(['Admin']), categoriesController.deleteCategory);

module.exports = router;
