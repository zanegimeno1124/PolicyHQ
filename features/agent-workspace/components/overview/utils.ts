import React from 'react';

export interface DateRange {
  start: number | null;
  end: number | null;
  label: string;
}

export const formatCurrencyCompact = (val: number) => {
  return new Intl.NumberFormat('en-US', { 
    notation: 'compact', 
    maximumFractionDigits: 1, 
    style: 'currency', 
    currency: 'USD' 
  }).format(val || 0);
};

export const getTodayRange = (): DateRange => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return { start, end, label: 'Today' };
};

export const getYesterdayRange = (): DateRange => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).getTime();
    return { start, end, label: 'Yesterday' };
};

export const getWeekRange = (): DateRange => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0,0,0,0);
    const end = new Date(now);
    end.setHours(23,59,59,999);
    return { start: start.getTime(), end: end.getTime(), label: 'This Week' };
};

export const getMonthRange = (): DateRange => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return { start, end, label: 'This Month' };
};

export const getYearRange = (): DateRange => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
    return { start, end, label: 'This Year' };
};

export const getAllTimeRange = (): DateRange => {
    return { start: null, end: null, label: 'All Time' };
};

export const getAgencyName = (entry: any) => {
  if (!entry) return 'PolicyHQ';
  if (entry.agency_name) return entry.agency_name;
  if (typeof entry.agency === 'string' && entry.agency !== 'DIRECT') return entry.agency;
  if (entry.agency?.label) return entry.agency.label;
  if (entry.agency?.name) return entry.agency.name;
  return entry.agency === 'DIRECT' ? 'Direct Writing' : 'PolicyHQ';
};