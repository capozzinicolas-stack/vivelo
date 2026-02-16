import { Profile } from '@/types/database';

export const mockUsers: Profile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'maria@example.com',
    full_name: 'María González',
    avatar_url: null,
    role: 'client',
    phone: '787-555-0101',
    company_name: null,
    bio: 'Organizadora de eventos sociales',
    verified: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'carlos@example.com',
    full_name: 'Carlos Rivera',
    avatar_url: null,
    role: 'provider',
    phone: '787-555-0102',
    company_name: 'Catering Rivera',
    bio: 'Más de 10 años de experiencia en catering para eventos',
    verified: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'admin@vivelo.com',
    full_name: 'Admin Vivelo',
    avatar_url: null,
    role: 'admin',
    phone: '787-555-0100',
    company_name: 'Vivelo Inc',
    bio: 'Administrador de la plataforma',
    verified: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

export function getMockUser(role: string): Profile | undefined {
  return mockUsers.find(u => u.role === role);
}
