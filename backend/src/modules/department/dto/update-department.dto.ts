export interface UpdateDepartmentDTO {
  name?: string;
  parentId?: string | null;
  managerId?: string | null;
  status?: 'Active' | 'Inactive';
}
