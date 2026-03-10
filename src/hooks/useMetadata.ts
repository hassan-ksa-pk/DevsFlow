import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { setPageMetadata } from '../lib/metadata';

/**
 * Hook to automatically set page metadata based on the current route
 */
export function useMetadata(): void {
  const location = useLocation();

  useEffect(() => {
    setPageMetadata(location.pathname);
  }, [location.pathname]);
}
