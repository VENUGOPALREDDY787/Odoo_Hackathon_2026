import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, LayoutGrid, Plus, Settings, Trash2, Users, X } from "lucide-react";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { categories as seedCategories, departments as seedDepartments, employees as seedEmployees, statusColor } from "../lib/assetflow-data";

type DepartmentForm = { id: string; name: string; parent: string; head: string; status: string; assets: number };
type CategoryForm = { name: string; fields: string; status: string; count: number };
type EmployeeForm = { id: number; name: string; email: string; dept: string; role: string; status: string };

const emptyDepartment: DepartmentForm = { id: "", name: "", parent: "", head: "", status: "Active", assets: 0 };
const emptyCategory: CategoryForm = { name: "", fields: "", status: "Active", count: 0 };
const emptyEmployee: EmployeeForm = { id: 0, name: "", email: "", dept: "", role: "Employee", status: "Active" };

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
        <div>
          <NeoBadge color="bg-red-400">Admin only</NeoBadge>
          <h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Org Setup.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Create, edit, delete, deactivate, and promote master data</p>
        </div>
        <NeoBadge color="bg-black text-white px-4 py-2 text-sm">Admin CRUD Console</NeoBadge>
      </div>

      {notice && (
        <NeoCard color="bg-[#ccff00]" className="p-4" interactive={false}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="font-black uppercase">{notice}</p>
            <NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => setNotice("")}>Dismiss</NeoButton>
          </div>
        </NeoCard>
      )}

      <div className="flex gap-4 overflow-x-auto pb-3">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            aria-pressed={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 font-black uppercase border-4 border-black rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-[#ccff00] shadow-[4px_4px_0_0_#000]" : "bg-white hover:bg-neutral-100"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
          {activeTab === "departments" && <DepartmentsTab setNotice={setNotice} />}
          {activeTab === "categories" && <CategoriesTab setNotice={setNotice} />}
          {activeTab === "employees" && <EmployeesTab setNotice={setNotice} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PanelHeader({ title, isEditing, onNew }: { title: string; isEditing: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
      <h2 className="text-2xl font-black uppercase">{title}</h2>
      <NeoButton variant={isEditing ? "white" : "lime"} onClick={onNew}>
        {isEditing ? <X size={18} /> : <Plus size={18} />} {isEditing ? "Cancel Form" : "Create New"}
      </NeoButton>
    </div>
  );
}

function DepartmentsTab({ setNotice }: { setNotice: (message: string) => void }) {
  const [departments, setDepartments] = useState<DepartmentForm[]>(seedDepartments.map((dept) => ({ ...dept })));
  const [form, setForm] = useState<DepartmentForm | null>(null);
  const isEditing = Boolean(form);

  const save = () => {
    if (!form?.name.trim()) {
      setNotice("Department name is required.");
      return;
    }
    const payload = { ...form, id: form.id || `DEP-${Date.now()}` };
    setDepartments((items) => items.some((item) => item.id === payload.id) ? items.map((item) => item.id === payload.id ? payload : item) : [payload, ...items]);
    setForm(null);
    setNotice(`${payload.name} saved.`);
  };

  return (
    <div className="space-y-6">
      <PanelHeader title="Department Management" isEditing={isEditing} onNew={() => setForm(isEditing ? null : { ...emptyDepartment })} />

      {form && (
        <NeoCard color="bg-[#ccff00]" interactive={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <NeoInput placeholder="Department name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="bg-white" />
            <NeoInput placeholder="Parent department" value={form.parent} onChange={(event) => setForm({ ...form, parent: event.target.value })} className="bg-white" />
            <NeoInput placeholder="Department head" value={form.head} onChange={(event) => setForm({ ...form, head: event.target.value })} className="bg-white" />
            <NeoInput type="number" placeholder="Asset count" value={form.assets} onChange={(event) => setForm({ ...form, assets: Number(event.target.value) })} className="bg-white" />
            <NeoSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="bg-white">
              <option>Active</option>
              <option>Inactive</option>
            </NeoSelect>
          </div>
          <div className="mt-5 flex gap-3">
            <NeoButton variant="black" onClick={save}>Save Department</NeoButton>
            <NeoButton variant="white" onClick={() => setForm(null)}>Cancel</NeoButton>
          </div>
        </NeoCard>
      )}

      <NeoCard className="p-0 overflow-hidden" interactive={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="bg-black text-white uppercase text-xs font-black"><th className="p-4">Department</th><th className="p-4">Parent</th><th className="p-4">Head</th><th className="p-4">Assets</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="font-bold">
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b-4 border-black bg-white">
                  <td className="p-4 uppercase">{dept.name}</td>
                  <td className="p-4 uppercase text-neutral-600">{dept.parent || "-"}</td>
                  <td className="p-4 uppercase">{dept.head || "Unassigned"}</td>
                  <td className="p-4">{dept.assets}</td>
                  <td className="p-4"><NeoBadge color={statusColor(dept.status)}>{dept.status}</NeoBadge></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <NeoButton variant="white" className="p-2" aria-label={`Edit ${dept.name}`} onClick={() => setForm({ ...dept })}><Edit3 size={16} /></NeoButton>
                      <NeoButton variant="black" className="p-2" aria-label={`Delete ${dept.name}`} onClick={() => { setDepartments((items) => items.filter((item) => item.id !== dept.id)); setNotice(`${dept.name} deleted.`); }}><Trash2 size={16} /></NeoButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
}

function CategoriesTab({ setNotice }: { setNotice: (message: string) => void }) {
  const [categories, setCategories] = useState<CategoryForm[]>(seedCategories.map((cat) => ({ ...cat })));
  const [form, setForm] = useState<CategoryForm | null>(null);
  const isEditing = Boolean(form);

  const save = () => {
    if (!form?.name.trim()) {
      setNotice("Category name is required.");
      return;
    }
    setCategories((items) => items.some((item) => item.name === form.name) ? items.map((item) => item.name === form.name ? form : item) : [form, ...items]);
    setForm(null);
    setNotice(`${form.name} saved.`);
  };

  return (
    <div className="space-y-6">
      <PanelHeader title="Asset Categories" isEditing={isEditing} onNew={() => setForm(isEditing ? null : { ...emptyCategory })} />

      {form && (
        <NeoCard color="bg-orange-400" interactive={false}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_140px_160px] gap-4">
            <NeoInput placeholder="Category name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="bg-white" />
            <NeoInput placeholder="Custom fields" value={form.fields} onChange={(event) => setForm({ ...form, fields: event.target.value })} className="bg-white" />
            <NeoInput type="number" placeholder="Count" value={form.count} onChange={(event) => setForm({ ...form, count: Number(event.target.value) })} className="bg-white" />
            <NeoSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="bg-white">
              <option>Active</option>
              <option>Inactive</option>
            </NeoSelect>
          </div>
          <div className="mt-5 flex gap-3">
            <NeoButton variant="black" onClick={save}>Save Category</NeoButton>
            <NeoButton variant="white" onClick={() => setForm(null)}>Cancel</NeoButton>
          </div>
        </NeoCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categories.map((cat) => (
          <NeoCard key={cat.name} color={cat.status === "Active" ? "bg-white" : "bg-neutral-200"} className="p-6" interactive>
            <div className="flex justify-between gap-3">
              <div><h3 className="text-2xl font-black uppercase">{cat.name}</h3><p className="font-bold text-sm text-neutral-600 mt-2">{cat.fields}</p></div>
              <NeoBadge color={statusColor(cat.status)}>{cat.status}</NeoBadge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <NeoButton variant="white" className="px-4 py-2 text-xs" onClick={() => setForm({ ...cat })}><Edit3 size={16} /> Edit</NeoButton>
              <NeoButton variant="orange" className="px-4 py-2 text-xs" onClick={() => { setCategories((items) => items.map((item) => item.name === cat.name ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item)); setNotice(`${cat.name} status toggled.`); }}>Toggle</NeoButton>
              <NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => { setCategories((items) => items.filter((item) => item.name !== cat.name)); setNotice(`${cat.name} deleted.`); }}>Delete</NeoButton>
            </div>
          </NeoCard>
        ))}
      </div>
    </div>
  );
}

function EmployeesTab({ setNotice }: { setNotice: (message: string) => void }) {
  const [employees, setEmployees] = useState<EmployeeForm[]>(seedEmployees.map((emp) => ({ ...emp })));
  const [form, setForm] = useState<EmployeeForm | null>(null);
  const [query, setQuery] = useState("");
  const isEditing = Boolean(form);
  const filteredEmployees = employees.filter((emp) => `${emp.name} ${emp.email} ${emp.dept} ${emp.role}`.toLowerCase().includes(query.toLowerCase()));

  const save = () => {
    if (!form?.name.trim() || !form.email.trim()) {
      setNotice("Employee name and email are required.");
      return;
    }
    const payload = { ...form, id: form.id || Date.now() };
    setEmployees((items) => items.some((item) => item.id === payload.id) ? items.map((item) => item.id === payload.id ? payload : item) : [payload, ...items]);
    setForm(null);
    setNotice(`${payload.name} saved.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h2 className="text-2xl font-black uppercase">Directory & Role Assignment</h2>
        <div className="flex gap-2">
          <NeoInput placeholder="Search employee..." className="bg-white" value={query} onChange={(event) => setQuery(event.target.value)} />
          <NeoButton variant="purple" onClick={() => setForm(isEditing ? null : { ...emptyEmployee })}><Plus size={18} /> Invite</NeoButton>
        </div>
      </div>

      {form && (
        <NeoCard color="bg-purple-200" interactive={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <NeoInput placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="bg-white" />
            <NeoInput type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="bg-white" />
            <NeoInput placeholder="Department" value={form.dept} onChange={(event) => setForm({ ...form, dept: event.target.value })} className="bg-white" />
            <NeoSelect value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="bg-white"><option>Employee</option><option>Asset Manager</option><option>Department Head</option><option>Admin</option></NeoSelect>
            <NeoSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="bg-white"><option>Active</option><option>Inactive</option></NeoSelect>
          </div>
          <div className="mt-5 flex gap-3">
            <NeoButton variant="black" onClick={save}>Save Employee</NeoButton>
            <NeoButton variant="white" onClick={() => setForm(null)}>Cancel</NeoButton>
          </div>
        </NeoCard>
      )}

      <NeoCard className="p-0 overflow-hidden" interactive={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left">
            <thead><tr className="bg-black text-white uppercase text-xs font-black"><th className="p-4">Employee</th><th className="p-4">Email</th><th className="p-4">Department</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="font-bold">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b-4 border-black bg-white">
                  <td className="p-4 uppercase">{emp.name}</td>
                  <td className="p-4 lowercase text-neutral-600">{emp.email}</td>
                  <td className="p-4 uppercase">{emp.dept}</td>
                  <td className="p-4"><NeoBadge color={statusColor(emp.role)}>{emp.role}</NeoBadge></td>
                  <td className="p-4"><NeoBadge color={statusColor(emp.status)}>{emp.status}</NeoBadge></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <NeoSelect className="w-44 py-2" value={emp.role} onChange={(event) => { setEmployees((items) => items.map((item) => item.id === emp.id ? { ...item, role: event.target.value } : item)); setNotice(`${emp.name} promoted to ${event.target.value}.`); }}><option>Employee</option><option>Asset Manager</option><option>Department Head</option><option>Admin</option></NeoSelect>
                      <NeoButton variant="white" className="p-2" onClick={() => setForm({ ...emp })}><Edit3 size={16} /></NeoButton>
                      <NeoButton variant="black" className="p-2" onClick={() => { setEmployees((items) => items.filter((item) => item.id !== emp.id)); setNotice(`${emp.name} removed from directory.`); }}><Trash2 size={16} /></NeoButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
}
