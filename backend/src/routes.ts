import { Router } from 'express';
import authRouter from './modules/auth/routes/auth.routes';
import departmentRouter from './modules/department/routes/department.routes';
import categoryRouter from './modules/asset-category/routes/category.routes';
import employeeRouter from './modules/employee/routes/employee.routes';
import assetRouter from './modules/asset/routes/asset.routes';
import allocationRouter from './modules/allocation/routes/allocation.routes';
import transferRouter from './modules/allocation/routes/transfer.routes';

const router = Router();

// Mount TS modules
router.use('/auth', authRouter);
router.use('/departments', departmentRouter);
router.use('/categories', categoryRouter);
router.use('/employees', employeeRouter);
router.use('/assets', assetRouter);
router.use('/allocations', allocationRouter);
router.use('/transfers', transferRouter);

export default router;
