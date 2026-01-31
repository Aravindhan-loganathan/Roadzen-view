import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchAllUsers } from '@/services/userApi';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  location: string;
  vehicle_number?: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllUsers().then(setUsers).catch(console.error);
  }, []);

  const filteredUsers = users.filter(u =>
    (u.email?.toLowerCase().includes(search.toLowerCase()) || false) ||
  (u.phone?.includes(search) || false)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">User Management</h1>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or phone"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="glow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Location</th>
              <th className="p-3 text-left">Vehicle</th>
              <th className="p-3 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-t">
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.phone}</td>
                <td className="p-3">{user.location}</td>
                <td className="p-3">
                  {user.vehicle_number || '—'}
                </td>
                <td className="p-3 capitalize">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
