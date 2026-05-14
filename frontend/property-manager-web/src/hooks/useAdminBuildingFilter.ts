import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBuilding } from '../contexts/BuildingContext';
import { isAdminRole } from '../utils/auth';
export type WithBuildingId = {
    buildingId?: number | null;
};
function sameBuildingId(itemBuildingId: number | null | undefined, selected: number | null): boolean {
    if (selected == null)
        return true;
    if (itemBuildingId == null || itemBuildingId === undefined)
        return false;
    return Number(itemBuildingId) === Number(selected);
}
export function useAdminBuildingFilter<T extends WithBuildingId>(items: T[]): T[] {
    const { auth } = useAuth();
    const { selectedBuildingId } = useBuilding();
    return useMemo(() => {
        if (!isAdminRole(auth?.role))
            return items;
        if (selectedBuildingId == null)
            return items;
        return items.filter((i) => sameBuildingId(i.buildingId, selectedBuildingId));
    }, [items, auth?.role, selectedBuildingId]);
}
