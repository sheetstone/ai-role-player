import { request } from './api'
import type { Scenario, Persona } from '../types'

export const adminApi = {
  // Scenarios
  getScenarios: () => request<Scenario[]>('/admin/scenarios'),
  createScenario: (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Scenario>('/admin/scenarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateScenario: (id: string, data: Partial<Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>>) =>
    request<Scenario>(`/admin/scenarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteScenario: (id: string) =>
    request<void>(`/admin/scenarios/${id}`, { method: 'DELETE' }),

  // Personas
  getPersonas: () => request<Persona[]>('/admin/personas'),
  createPersona: (data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<Persona>('/admin/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePersona: (id: string, data: Partial<Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>>) =>
    request<Persona>(`/admin/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePersona: (id: string) =>
    request<void>(`/admin/personas/${id}`, { method: 'DELETE' }),

  // Preview
  previewPersona: (systemPrompt: string) =>
    request<{ reply: string }>('/admin/preview-persona', {
      method: 'POST',
      body: JSON.stringify({ systemPrompt }),
    }),
}
