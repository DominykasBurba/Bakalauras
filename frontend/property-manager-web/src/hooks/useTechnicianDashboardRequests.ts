import { useEffect, useMemo, useState } from 'react';
import { getMaintenanceRequests } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAdminBuildingFilter } from './useAdminBuildingFilter';
import type { MaintenanceRequest } from '../types';
export function useTechnicianDashboardRequests() {
    const { auth } = useAuth();
    const showToast = useToast();
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!auth?.token)
            return;
        getMaintenanceRequests(auth.token)
            .then(setRequests)
            .catch(() => {
            setRequests([]);
            showToast('Could not load work orders.', 'error');
        })
            .finally(() => setLoading(false));
    }, [auth?.token, showToast]);
    const scopedRequests = useAdminBuildingFilter(requests);
    const notCompleted = useMemo(() => scopedRequests.filter((r) => r.status !== 'Completed'), [scopedRequests]);
    const assignedTasks = useMemo(() => notCompleted.filter((r) => r.status !== 'Unpaid'), [notCompleted]);
    const awaitingResidentPayment = useMemo(() => notCompleted.filter((r) => r.status === 'Unpaid'), [notCompleted]);
    const inProgress = useMemo(() => scopedRequests.filter((r) => r.status === 'In Progress'), [scopedRequests]);
    const completedTasks = useMemo(() => scopedRequests.filter((r) => r.status === 'Completed'), [scopedRequests]);
    const allAssignedJobs = scopedRequests;
    return {
        loading,
        assignedTasks,
        awaitingResidentPayment,
        inProgress,
        completedTasks,
        allAssignedJobs,
    };
}
