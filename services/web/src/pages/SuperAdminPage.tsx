import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminPage() {
    const navigate = useNavigate();
    
    useEffect(() => {
        navigate('/management/companies', { replace: true });
    }, [navigate]);

    return null;
}
