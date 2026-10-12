import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/customer/AdminDashboard';
import '../studio.css';
import './admin.css';
export const metadata:Metadata={title:'Quản trị | AIEV Studio'};
export default function AdminPage(){return <AdminDashboard/>;}
