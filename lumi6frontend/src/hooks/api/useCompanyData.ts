import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Company, Candidate, CreditBalance, DashboardStats, PaginatedResponse, PaginationParams } from '@/types/common';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Company queries
export const useCompanyData = (companyId: string) => {
  return useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/companies/${companyId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!companyId,
  });
};

export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/superadmin/companies`, {
        headers: getAuthHeaders(),
      });
      return response.data.companies || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Candidates queries
export const useCandidates = (companyId: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: ['candidates', companyId, params],
    queryFn: async (): Promise<PaginatedResponse<Candidate>> => {
      const searchParams = new URLSearchParams({
        page: params?.page?.toString() || '1',
        limit: params?.limit?.toString() || '20',
        search: params?.search || '',
        sortBy: params?.sortBy || 'createdAt',
        sortOrder: params?.sortOrder || 'desc',
      });
      
      const response = await axios.get(
        `${API_URL}/api/companies/${companyId}/candidates/enhanced?${searchParams}`,
        { headers: getAuthHeaders() }
      );
      
      return {
        data: response.data.candidates,
        pagination: response.data.pagination,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!companyId,
  });
};

export const useCandidate = (candidateId: string) => {
  return useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/candidates/${candidateId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    enabled: !!candidateId,
  });
};

// Credit system queries
export const useCreditBalances = (companyId: string) => {
  return useQuery({
    queryKey: ['creditBalances', companyId],
    queryFn: async (): Promise<CreditBalance[]> => {
      const response = await axios.get(`${API_URL}/api/credits/balances/${companyId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.balances || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!companyId,
  });
};

export const usePermissions = (companyId: string) => {
  return useQuery({
    queryKey: ['permissions', companyId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/credits/permissions/${companyId}`, {
        headers: getAuthHeaders(),
      });
      return response.data.permissions || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!companyId,
  });
};

// Dashboard stats
export const useDashboardStats = (companyId: string) => {
  return useQuery({
    queryKey: ['dashboardStats', companyId],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await axios.get(`${API_URL}/api/companies/${companyId}/stats`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: !!companyId,
  });
};

// Mutations
export const useCreateCandidate = (companyId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (candidateData: { firstName: string; lastName: string; email: string }) => {
      const response = await axios.post(
        `${API_URL}/api/companies/${companyId}/candidates`,
        candidateData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate candidates query to refetch data
      queryClient.invalidateQueries({ queryKey: ['candidates', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', companyId] });
    },
  });
};

export const useUpdateCandidate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ candidateId, data }: { candidateId: string; data: Partial<Candidate> }) => {
      const response = await axios.patch(
        `${API_URL}/api/candidates/${candidateId}`,
        data,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (_, { candidateId }) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
};

export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (candidateId: string) => {
      await axios.delete(`${API_URL}/api/candidates/${candidateId}`, {
        headers: getAuthHeaders(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useCreateTest = (companyId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testData: any) => {
      const response = await axios.post(
        `${API_URL}/api/companies/${companyId}/tests`,
        testData,
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', companyId] });
    },
  });
}; 