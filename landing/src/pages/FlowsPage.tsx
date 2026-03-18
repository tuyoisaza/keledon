import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FlowsPage() {
    const navigate = useNavigate();
    
    useEffect(() => {
        navigate('/flows/list', { replace: true });
    }, [navigate]);

    return null;
}
