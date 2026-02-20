import React from 'react';

const ModulePlaceholder = ({ title, description }: { title: string, description: string }) => (
    <div className="border border-slate-800 bg-slate-900/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-96">
        <h2 className="text-2xl font-bold text-slate-200 mb-2">{title}</h2>
        <p className="text-slate-500 max-w-md">{description}</p>
    </div>
);

export const HybridPolicies: React.FC = () => <ModulePlaceholder title="Global Policy Management" description="Search, audit, and manage policies across all agencies." />;
export const HybridCommissions: React.FC = () => <ModulePlaceholder title="System Commissions" description="Oversee commission grids, payouts, and reconciliation at a global level." />;
export const HybridDebts: React.FC = () => <ModulePlaceholder title="Global Debt Recovery" description="Monitor outstanding balances and collections across the entire system." />;
export const HybridContracting: React.FC = () => <ModulePlaceholder title="Carrier Contracting" description="Manage carrier appointments and contracting workflows system-wide." />;
export const HybridTicketing: React.FC = () => <ModulePlaceholder title="Support Ticketing" description="Centralized ticketing system for agent and agency support requests." />;
export const HybridUsers: React.FC = () => <ModulePlaceholder title="User & Roles" description="Manage super-admin users, agency owners, and global permission sets." />;
export const HybridSettings: React.FC = () => <ModulePlaceholder title="System Configuration" description="Master settings, API configurations, and environment variables." />;