import React, { useState } from "react";
import { NeoCard, NeoButton, NeoInput, NeoBadge, NeoSelect } from "../components/ui/NeoBrutalist";
import { Plus, Users, LayoutGrid, Settings, Edit3, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrganizationSetup() {
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "employees">("departments");

  return (
    <div className="p-8 max-w-7xl mx-auto overflow-hidden">
      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="flex justify-between items-end mb-8 border-b-8 border-black pb-8">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter">Org Setup.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Admin Control Center</p>
        </div>
        <NeoBadge color="bg-red-400 text-black px-4 py-2 text-sm">Admin Access Only</NeoBadge>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
        {[
          { id: "departments", label: "Departments", icon: <LayoutGrid size={18} /> },
          { id: "categories", label: "Asset Categories", icon: <Settings size={18} /> },
          { id: "employees", label: "Employee Directory", icon: <Users size={18} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-3 font-black uppercase border-4 border-black rounded-xl
              transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? "bg-[#ccff00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-0" 
                : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-100 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "departments" && <DepartmentsTab />}
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "employees" && <EmployeesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DepartmentsTab() {
  const departments = [
    { name: "Engineering", head: "Jake Peralta", parent: "None", status: "Active" },
    { name: "Design", head: "Rosa Diaz", parent: "Engineering", status: "Active" },
    { name: "Marketing", head: "Charles Boyle", parent: "None", status: "Active" },
    { name: "Legacy Dept", head: "Unknown", parent: "None", status: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase">Department Management</h2>
        <NeoButton variant="lime"><Plus className="mr-2" /> Create Department</NeoButton>
      </div>

      <NeoCard className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white uppercase text-sm font-black tracking-widest border-b-4 border-black">
                <th className="p-4">Department Name</th>
                <th className="p-4">Parent Dept</th>
                <th className="p-4">Dept Head</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {departments.map((dept, i) => (
                <motion.tr whileHover={{ backgroundColor: "#f3f4f6" }} key={i} className="border-b-4 border-black transition-colors cursor-pointer">
                  <td className="p-4 uppercase text-lg">{dept.name}</td>
                  <td className="p-4 text-neutral-500 uppercase">{dept.parent}</td>
                  <td className="p-4 uppercase">{dept.head}</td>
                  <td className="p-4">
                    <NeoBadge color={dept.status === "Active" ? "bg-[#ccff00]" : "bg-neutral-300"}>
                      {dept.status}
                    </NeoBadge>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <NeoButton variant="white" className="p-2"><Edit3 size={16} /></NeoButton>
                    <NeoButton variant="black" className="p-2"><Trash2 size={16} /></NeoButton>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
}

function CategoriesTab() {
  const categories = [
    { name: "Electronics", fields: "Warranty Period, Serial Number, OS", status: "Active" },
    { name: "Furniture", fields: "Material, Dimensions", status: "Active" },
    { name: "Vehicles", fields: "License Plate, Mileage, Insurance Exp", status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase">Asset Categories</h2>
        <NeoButton variant="orange"><Plus className="mr-2" /> Create Category</NeoButton>
      </div>

      <NeoCard className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white uppercase text-sm font-black tracking-widest border-b-4 border-black">
                <th className="p-4">Category Name</th>
                <th className="p-4">Custom Fields</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {categories.map((cat, i) => (
                <motion.tr whileHover={{ backgroundColor: "#f3f4f6" }} key={i} className="border-b-4 border-black transition-colors cursor-pointer">
                  <td className="p-4 uppercase text-lg">{cat.name}</td>
                  <td className="p-4 text-neutral-600 uppercase text-xs leading-relaxed max-w-xs">{cat.fields}</td>
                  <td className="p-4">
                    <NeoBadge color="bg-[#ccff00]">{cat.status}</NeoBadge>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <NeoButton variant="white" className="p-2"><Edit3 size={16} /></NeoButton>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
}

function EmployeesTab() {
  const employees = [
    { name: "Jake Peralta", email: "jake@b99.com", dept: "Engineering", role: "Admin", status: "Active" },
    { name: "Rosa Diaz", email: "rosa@b99.com", dept: "Design", role: "Department Head", status: "Active" },
    { name: "Charles Boyle", email: "charles@b99.com", dept: "Marketing", role: "Employee", status: "Active" },
    { name: "Gina Linetti", email: "gina@b99.com", dept: "HR", role: "Asset Manager", status: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black uppercase">Directory & Roles</h2>
        <div className="flex gap-2 w-full md:w-auto">
           <NeoInput placeholder="Search employee..." className="flex-1 bg-white" />
           <NeoButton variant="purple"><Plus className="mr-2" /> Invite</NeoButton>
        </div>
      </div>

      <NeoCard className="p-0 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white uppercase text-sm font-black tracking-widest border-b-4 border-black">
                <th className="p-4">Employee Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Department</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Role Assignment</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {employees.map((emp, i) => (
                <motion.tr whileHover={{ backgroundColor: "#f3f4f6" }} key={i} className="border-b-4 border-black transition-colors cursor-pointer">
                  <td className="p-4 uppercase flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-full border-2 border-black"></div>
                    {emp.name}
                  </td>
                  <td className="p-4 text-neutral-500 text-sm lowercase">{emp.email}</td>
                  <td className="p-4 uppercase">{emp.dept}</td>
                  <td className="p-4">
                    <NeoBadge color={
                      emp.role === "Admin" ? "bg-red-400 text-black" : 
                      emp.role === "Department Head" ? "bg-purple-400" :
                      emp.role === "Asset Manager" ? "bg-orange-400" :
                      "bg-white"
                    }>
                      {emp.role}
                    </NeoBadge>
                  </td>
                  <td className="p-4">
                     <NeoBadge color={emp.status === "Active" ? "bg-[#ccff00]" : "bg-neutral-300"}>
                      {emp.status}
                    </NeoBadge>
                  </td>
                  <td className="p-4 text-right">
                    <NeoSelect className="w-40 text-sm py-2">
                       <option>Set Role...</option>
                       <option>Employee</option>
                       <option>Asset Manager</option>
                       <option>Department Head</option>
                       <option>Admin</option>
                    </NeoSelect>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
}
