const prisma = require('../src/config/db');
const bcrypt = require('bcrypt');

async function main() {
  console.log('Seeding database...');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
    },
  });
  console.log(`Created Organization: ${org.name}`);

  // 2. Hash Passwords
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const managerPasswordHash = await bcrypt.hash('Manager@123', 10);
  const headPasswordHash = await bcrypt.hash('Head@123', 10);
  const employeePasswordHash = await bcrypt.hash('Employee@123', 10);

  // 3. Create Default Employees
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Alice Admin',
      email: 'admin@acme.com',
      passwordHash: adminPasswordHash,
      role: 'Admin',
      status: 'Active',
    },
  });

  const manager = await prisma.employee.upsert({
    where: { email: 'manager@acme.com' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Mark Manager',
      email: 'manager@acme.com',
      passwordHash: managerPasswordHash,
      role: 'Asset Manager',
      status: 'Active',
    },
  });

  const deptHead = await prisma.employee.upsert({
    where: { email: 'head@acme.com' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Helen Head',
      email: 'head@acme.com',
      passwordHash: headPasswordHash,
      role: 'Department Head',
      status: 'Active',
    },
  });

  const employee = await prisma.employee.upsert({
    where: { email: 'employee@acme.com' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Priya Patel',
      email: 'employee@acme.com',
      passwordHash: employeePasswordHash,
      role: 'Employee',
      status: 'Active',
    },
  });

  const employee2 = await prisma.employee.upsert({
    where: { email: 'raj@acme.com' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Raj Kumar',
      email: 'raj@acme.com',
      passwordHash: employeePasswordHash,
      role: 'Employee',
      status: 'Active',
    },
  });

  console.log('Created core employees');

  // 4. Create Departments (Checking if already seeded)
  let engDept = await prisma.department.findFirst({
    where: { organizationId: org.id, name: 'Engineering' }
  });
  if (!engDept) {
    engDept = await prisma.department.create({
      data: {
        organizationId: org.id,
        name: 'Engineering',
        managerId: deptHead.id,
        status: 'Active',
      },
    });
  }

  let hrDept = await prisma.department.findFirst({
    where: { organizationId: org.id, name: 'Human Resources' }
  });
  if (!hrDept) {
    hrDept = await prisma.department.create({
      data: {
        organizationId: org.id,
        name: 'Human Resources',
        status: 'Active',
      },
    });
  }

  console.log('Created departments');

  // Update employees departmentId
  await prisma.employee.update({
    where: { id: employee.id },
    data: { departmentId: engDept.id },
  });
  await prisma.employee.update({
    where: { id: employee2.id },
    data: { departmentId: engDept.id },
  });
  await prisma.employee.update({
    where: { id: deptHead.id },
    data: { departmentId: engDept.id },
  });

  // 5. Create Asset Categories
  const electronics = await prisma.assetCategory.create({
    data: {
      organizationId: org.id,
      name: 'Electronics',
      customFields: { warrantyPeriodMonths: 24, powerRatingWatts: 65 },
    },
  });

  const furniture = await prisma.assetCategory.create({
    data: {
      organizationId: org.id,
      name: 'Furniture',
      customFields: { material: 'Wood', ergonomicsCertified: true },
    },
  });

  const vehicles = await prisma.assetCategory.create({
    data: {
      organizationId: org.id,
      name: 'Vehicles',
      customFields: { fuelType: 'Electric', seatingCapacity: 5 },
    },
  });

  const spaces = await prisma.assetCategory.create({
    data: {
      organizationId: org.id,
      name: 'Office Spaces',
      customFields: { capacity: 20, projectorAvailable: true },
    },
  });

  console.log('Created asset categories');

  // 6. Create Assets
  const asset1 = await prisma.asset.create({
    data: {
      organizationId: org.id,
      categoryId: electronics.id,
      assetTag: 'AF-0001',
      serialNumber: 'SN-12345',
      name: 'Developer Laptop Dell XPS',
      acquisitionDate: new Date('2026-01-15'),
      acquisitionCost: 1500.00,
      condition: 'Good',
      location: 'HQ Room 101',
      status: 'Available',
      isShared: false,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      organizationId: org.id,
      categoryId: electronics.id,
      assetTag: 'AF-0002',
      serialNumber: 'SN-67890',
      name: 'MacBook Pro 16"',
      acquisitionDate: new Date('2026-02-10'),
      acquisitionCost: 2500.00,
      condition: 'New',
      location: 'HQ Room 102',
      status: 'Allocated',
      isShared: false,
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      organizationId: org.id,
      categoryId: furniture.id,
      assetTag: 'AF-0003',
      serialNumber: 'SN-FUR44',
      name: 'Ergonomic Desk Chair',
      acquisitionDate: new Date('2026-03-01'),
      acquisitionCost: 350.00,
      condition: 'Good',
      location: 'HQ Room 101',
      status: 'Available',
      isShared: false,
    },
  });

  const asset4 = await prisma.asset.create({
    data: {
      organizationId: org.id,
      categoryId: spaces.id,
      assetTag: 'AF-0004',
      name: 'Conference Room B2',
      acquisitionDate: new Date('2025-08-01'),
      acquisitionCost: 0.00,
      condition: 'Good',
      location: 'HQ Floor 2',
      status: 'Available',
      isShared: true,
    },
  });

  const asset5 = await prisma.asset.create({
    data: {
      organizationId: org.id,
      categoryId: vehicles.id,
      assetTag: 'AF-0005',
      serialNumber: 'SN-VEH99',
      name: 'Tesla Model Y',
      acquisitionDate: new Date('2025-11-20'),
      acquisitionCost: 45000.00,
      condition: 'Good',
      location: 'HQ Garage',
      status: 'Available',
      isShared: true,
    },
  });

  console.log('Created assets');

  // 7. Create Allocation
  const allocation = await prisma.allocation.create({
    data: {
      organizationId: org.id,
      assetId: asset2.id,
      allocatedToType: 'Employee',
      employeeId: employee.id,
      allocatedBy: manager.id,
      expectedReturnDate: new Date('2026-12-31T23:59:59'),
      status: 'Active',
    },
  });
  console.log(`Allocated asset ${asset2.assetTag} to ${employee.name}`);

  // 8. Create Resource Booking
  const booking = await prisma.resourceBooking.create({
    data: {
      organizationId: org.id,
      assetId: asset4.id,
      bookedBy: employee2.id,
      startTime: new Date('2026-07-15T09:00:00Z'),
      endTime: new Date('2026-07-15T11:00:00Z'),
      status: 'Upcoming',
      notes: 'Weekly Engineering Sync',
    },
  });
  console.log(`Created resource booking for ${asset4.name}`);

  // 9. Create Maintenance Request
  const maintenance = await prisma.maintenanceRequest.create({
    data: {
      organizationId: org.id,
      assetId: asset2.id,
      raisedBy: employee.id,
      issueDescription: 'Laptop screen flickering occasionally.',
      priority: 'Medium',
      status: 'Pending',
    },
  });
  console.log(`Created maintenance request for ${asset2.name}`);

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
