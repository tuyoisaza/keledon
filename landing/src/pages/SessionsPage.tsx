import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SessionsPage() {
    const navigate = useNavigate();
    
    useEffect(() => {
        navigate('/sessions/history', { replace: true });
    }, [navigate]);

    return null;
}
