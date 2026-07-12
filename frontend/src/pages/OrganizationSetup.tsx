import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, LayoutGrid, Plus, Settings, Trash2, Users } from "lucide-react";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { categories as seedCategories, departments as seedDepartments, employees as seedEmployees, statusColor } from "../lib/assetflow-data";

export default function OrganizationSetup() {
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "employees">("departments");
  const [notice, setNotice] = useState("");
  const tabs = [
    { id: "departments", label: "Departments", icon: <LayoutGrid size={18} /> },
    { id: "categories", label: "Asset Categories", icon: <Settings size={18} /> },
    { id: "employees", label: "Employee Directory", icon: <Users size={18} /> },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div><NeoBadge color="bg-red-400">Admin only</NeoBadge><h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Org Setup.</h1><p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Master data, directory, and role promotion</p></div>
        <NeoBadge color="bg-black text-white px-4 py-2 text-sm">No self-assigned admin roles</NeoBadge>
      </div>
      {notice && <NeoCard color="bg-[#ccff00]" className="p-4" interactive={false}><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="font-black uppercase">{notice}</p><NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => setNotice("")}>Dismiss</NeoButton></div></NeoCard>}
      <div className="flex gap-4 overflow-x-auto pb-3">{tabs.map((tab) => <button type="button" key={tab.id} aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 font-black uppercase border-4 border-black rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-[#ccff00] shadow-[4px_4px_0_0_#000]" : "bg-white hover:bg-neutral-100"}`}>{tab.icon} {tab.label}</button>)}</div>
      <AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>{activeTab === "departments" && <DepartmentsTab setNotice={setNotice} />}{activeTab === "categories" && <CategoriesTab setNotice={setNotice} />}{activeTab === "employees" && <EmployeesTab setNotice={setNotice} />}</motion.div></AnimatePresence>
    </div>
  );
}

function DepartmentsTab({ setNotice }: { setNotice: (message: string) => void }) {
  const [departments, setDepartments] = useState(seedDepartments);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4"><h2 className="text-2xl font-black uppercase">Department Management</h2><NeoButton variant="lime" onClick={() => { setDepartments((items) => [{ id: `DEP-${items.length + 1}`, name: "New Department", parent: "Operations", head: "Unassigned", status: "Active", assets: 0 }, ...items]); setNotice("New Department created in draft mode."); }}><Plus size={18} /> Create</NeoButton></div>
      <NeoCard className="p-0 overflow-hidden" interactive={false}><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="bg-black text-white uppercase text-xs font-black"><th className="p-4">Department</th><th className="p-4">Parent</th><th className="p-4">Head</th><th className="p-4">Assets</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="font-bold">{departments.map((dept) => <tr key={dept.id} className="border-b-4 border-black bg-white"><td className="p-4 uppercase">{dept.name}</td><td className="p-4 uppercase text-neutral-600">{dept.parent}</td><td className="p-4 uppercase">{dept.head}</td><td className="p-4">{dept.assets}</td><td className="p-4"><NeoBadge color={statusColor(dept.status)}>{dept.status}</NeoBadge></td><td className="p-4"><div className="flex justify-end gap-2"><NeoButton variant="white" className="p-2" aria-label={`Edit ${dept.name}`} onClick={() => setNotice(`${dept.name} selected for editing.`)}><Edit3 size={16} /></NeoButton><NeoButton variant="black" className="p-2" aria-label={`Deactivate ${dept.name}`} onClick={() => { setDepartments((items) => items.map((item) => item.id === dept.id ? { ...item, status: "Inactive" } : item)); setNotice(`${dept.name} deactivated.`); }}><Trash2 size={16} /></NeoButton></div></td></tr>)}</tbody></table></div></NeoCard>
    </div>
  );
}

function CategoriesTab({ setNotice }: { setNotice: (message: string) => void }) {
  const [categories, setCategories] = useState(seedCategories);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4"><h2 className="text-2xl font-black uppercase">Asset Categories</h2><NeoButton variant="orange" onClick={() => { setCategories((items) => [{ name: "New Category", fields: "Custom Field", status: "Active", count: 0 }, ...items]); setNotice("New Category created in draft mode."); }}><Plus size={18} /> Create</NeoButton></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{categories.map((cat) => <NeoCard key={cat.name} color="bg-white" className="p-6" interactive><div className="flex justify-between gap-3"><div><h3 className="text-2xl font-black uppercase">{cat.name}</h3><p className="font-bold text-sm text-neutral-600 mt-2">{cat.fields}</p></div><NeoBadge color="bg-[#ccff00]">{cat.count}</NeoBadge></div><div className="mt-5 flex gap-2"><NeoButton variant="white" className="px-4 py-2 text-xs" onClick={() => setNotice(`${cat.name} selected for editing.`)}><Edit3 size={16} /> Edit</NeoButton><NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => { setCategories((items) => items.map((item) => item.name === cat.name ? { ...item, status: "Inactive" } : item)); setNotice(`${cat.name} archived.`); }}>Archive</NeoButton></div></NeoCard>)}</div>
    </div>
  );
}

function EmployeesTab({ setNotice }: { setNotice: (message: string) => void }) {
  const [employees, setEmployees] = useState(seedEmployees);
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4"><h2 className="text-2xl font-black uppercase">Directory & Role Assignment</h2><div className="flex gap-2"><NeoInput placeholder="Search employee..." className="bg-white" /><NeoButton variant="purple" onClick={() => { setEmployees((items) => [{ id: Date.now(), name: "Invited Employee", email: "invite@assetflow.io", dept: "Unassigned", role: "Employee", status: "Active" }, ...items]); setNotice("Employee invite created with Employee role."); }}><Plus size={18} /> Invite</NeoButton></div></div>
      <NeoCard className="p-0 overflow-hidden" interactive={false}><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="bg-black text-white uppercase text-xs font-black"><th className="p-4">Employee</th><th className="p-4">Email</th><th className="p-4">Department</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-right">Promote</th></tr></thead><tbody className="font-bold">{employees.map((emp) => <tr key={emp.email} className="border-b-4 border-black bg-white"><td className="p-4 uppercase">{emp.name}</td><td className="p-4 lowercase text-neutral-600">{emp.email}</td><td className="p-4 uppercase">{emp.dept}</td><td className="p-4"><NeoBadge color={statusColor(emp.role)}>{emp.role}</NeoBadge></td><td className="p-4"><NeoBadge color={statusColor(emp.status)}>{emp.status}</NeoBadge></td><td className="p-4 text-right"><NeoSelect className="w-48 py-2" value={emp.role} onChange={(event) => { setEmployees((items) => items.map((item) => item.email === emp.email ? { ...item, role: event.target.value as any } : item)); setNotice(`${emp.name} role changed to ${event.target.value}.`); }}><option>Employee</option><option>Asset Manager</option><option>Department Head</option><option>Admin</option></NeoSelect></td></tr>)}</tbody></table></div></NeoCard>
    </div>
  );
}
