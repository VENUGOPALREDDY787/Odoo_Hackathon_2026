export type AssetStatus = "Available" | "Allocated" | "Reserved" | "Under Maintenance" | "Lost" | "Retired" | "Disposed";
export type Role = "Admin" | "Asset Manager" | "Department Head" | "Employee";

export const departments = [
  { id: "DEP-ENG", name: "Engineering", head: "Priya Nair", parent: "Operations", status: "Active", assets: 138 },
  { id: "DEP-DES", name: "Design", head: "Rosa Diaz", parent: "Product", status: "Active", assets: 74 },
  { id: "DEP-FAC", name: "Facilities", head: "Mark Liu", parent: "Operations", status: "Active", assets: 211 },
  { id: "DEP-HR", name: "People Ops", head: "Gina Linetti", parent: "Corporate", status: "Inactive", assets: 32 },
];

export const categories = [
  { name: "Electronics", fields: "Warranty Period, Serial Number, OS", status: "Active", count: 482 },
  { name: "Furniture", fields: "Material, Dimensions, Floor", status: "Active", count: 326 },
  { name: "Vehicles", fields: "Plate, Mileage, Insurance Expiry", status: "Active", count: 24 },
  { name: "Rooms", fields: "Capacity, AV Kit, Location", status: "Active", count: 18 },
];

export const employees = [
  { id: 1, name: "Aarav Mehta", email: "aarav@assetflow.io", dept: "Engineering", role: "Employee" as Role, status: "Active" },
  { id: 2, name: "Priya Nair", email: "priya@assetflow.io", dept: "Engineering", role: "Department Head" as Role, status: "Active" },
  { id: 3, name: "Rosa Diaz", email: "rosa@assetflow.io", dept: "Design", role: "Asset Manager" as Role, status: "Active" },
  { id: 4, name: "Mark Liu", email: "mark@assetflow.io", dept: "Facilities", role: "Admin" as Role, status: "Active" },
  { id: 5, name: "Gina Linetti", email: "gina@assetflow.io", dept: "People Ops", role: "Employee" as Role, status: "Inactive" },
];

export const assets = [
  { tag: "AF-0001", name: "MacBook Pro M3", category: "Electronics", serial: "MBP-M3-9912", status: "Allocated" as AssetStatus, holder: "Priya Nair", dept: "Engineering", location: "HQ - 4F", condition: "Excellent", returnDate: "Jul 18", cost: 2499, shared: false },
  { tag: "AF-0002", name: "Dell UltraSharp 27", category: "Electronics", serial: "DU27-2201", status: "Available" as AssetStatus, holder: "-", dept: "Design", location: "HQ - Studio", condition: "Good", returnDate: "-", cost: 489, shared: false },
  { tag: "AF-0003", name: "Conference Room B2", category: "Rooms", serial: "ROOM-B2", status: "Reserved" as AssetStatus, holder: "Product Sync", dept: "Facilities", location: "HQ - 2F", condition: "Ready", returnDate: "Today", cost: 0, shared: true },
  { tag: "AF-0004", name: "Sony A7IV Kit", category: "Electronics", serial: "A7IV-8832", status: "Under Maintenance" as AssetStatus, holder: "Rosa Diaz", dept: "Design", location: "Repair Bay", condition: "Sensor issue", returnDate: "-", cost: 2100, shared: true },
  { tag: "AF-0005", name: "Herman Miller Chair", category: "Furniture", serial: "HM-8821", status: "Allocated" as AssetStatus, holder: "Aarav Mehta", dept: "Engineering", location: "HQ - 4F", condition: "Fair", returnDate: "Jul 10", cost: 840, shared: false },
  { tag: "AF-0006", name: "EV Pool Car", category: "Vehicles", serial: "KA-05-EV-2188", status: "Available" as AssetStatus, holder: "-", dept: "Facilities", location: "Basement", condition: "Ready", returnDate: "-", cost: 24000, shared: true },
];

export const bookings = [
  { resource: "Conference Room B2", owner: "Priya Nair", start: "09:00", end: "10:00", status: "Completed" },
  { resource: "Conference Room B2", owner: "Rosa Diaz", start: "10:00", end: "12:00", status: "Ongoing" },
  { resource: "EV Pool Car", owner: "Facilities", start: "13:00", end: "15:00", status: "Upcoming" },
  { resource: "Studio 1", owner: "Design", start: "15:00", end: "17:00", status: "Upcoming" },
];

export const maintenanceRequests = [
  { id: "MR-104", asset: "Sony A7IV Kit", issue: "Sensor cleaning and lens calibration", priority: "High", status: "Approved", owner: "Rosa Diaz", technician: "Nikhil S.", age: "2h" },
  { id: "MR-105", asset: "MacBook Pro M3", issue: "Battery cycle warning", priority: "Medium", status: "Pending", owner: "Priya Nair", technician: "-", age: "5h" },
  { id: "MR-106", asset: "Herman Miller Chair", issue: "Armrest loose", priority: "Low", status: "In Progress", owner: "Aarav Mehta", technician: "Repair Desk", age: "1d" },
];

export const auditItems = [
  { tag: "AF-0001", asset: "MacBook Pro M3", expected: "HQ - 4F", found: "HQ - 4F", state: "Verified" },
  { tag: "AF-0002", asset: "Dell UltraSharp 27", expected: "HQ - Studio", found: "HQ - Studio", state: "Verified" },
  { tag: "AF-0005", asset: "Herman Miller Chair", expected: "HQ - 4F", found: "Remote", state: "Discrepancy" },
  { tag: "AF-0007", asset: "Tripod Kit", expected: "Studio 1", found: "Missing", state: "Missing" },
];

export const notifications = [
  { title: "Overdue return alert", detail: "AF-0005 was due Jul 10 from Aarav Mehta", time: "12 min ago", tone: "red" },
  { title: "Maintenance approved", detail: "MR-104 moved Sony A7IV Kit to Under Maintenance", time: "40 min ago", tone: "orange" },
  { title: "Booking reminder", detail: "EV Pool Car starts at 13:00", time: "1h ago", tone: "lime" },
  { title: "Audit discrepancy flagged", detail: "Tripod Kit missing from Studio 1", time: "2h ago", tone: "purple" },
];

export const stats = {
  available: assets.filter((asset) => asset.status === "Available").length,
  allocated: assets.filter((asset) => asset.status === "Allocated").length,
  maintenanceToday: maintenanceRequests.filter((request) => request.status !== "Resolved").length,
  activeBookings: bookings.filter((booking) => booking.status === "Ongoing" || booking.status === "Upcoming").length,
  pendingTransfers: 7,
  upcomingReturns: assets.filter((asset) => asset.returnDate !== "-" && asset.returnDate !== "Jul 10").length,
};

export function statusColor(status: string) {
  if (status === "Available" || status === "Verified" || status === "Completed" || status === "Active" || status === "Resolved") return "bg-[#ccff00]";
  if (status === "Allocated" || status === "Ongoing" || status === "Department Head" || status === "Approved") return "bg-purple-400";
  if (status === "Reserved" || status === "Pending" || status === "Upcoming" || status === "In Progress") return "bg-orange-400";
  if (status === "Under Maintenance" || status === "Discrepancy" || status === "Missing" || status === "Inactive") return "bg-red-400";
  return "bg-white";
}
