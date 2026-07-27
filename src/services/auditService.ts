import { apiFetch } from '../lib/api';

interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
}

export const getAuditLogs = async (params: GetAuditLogsParams = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.action) query.append('action', params.action);

  const queryString = query.toString();
  const endpoint = queryString ? `/audit_logs?${queryString}` : '/audit_logs';
  return await apiFetch(endpoint);
};

export const logAction = async (action: string, entity_type: string, entity_id: string, details: any) => {
  return await apiFetch('/audit_logs', {
    method: 'POST',
    body: JSON.stringify({ action, entity_type, entity_id, details })
  });
};