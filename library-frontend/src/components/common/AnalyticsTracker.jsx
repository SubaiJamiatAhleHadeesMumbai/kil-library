import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import analyticsService from '../../api/analyticsService';

const ignoredPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password', '/logout']);

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ignoredPaths.has(location.pathname)) return;

    const path = `${location.pathname}${location.search}`;
    const cacheKey = 'booknest_last_analytics_event';
    const currentKey = `${path}|visit`;

    try {
      const lastEventRaw = sessionStorage.getItem(cacheKey);
      if (lastEventRaw) {
        const lastEvent = JSON.parse(lastEventRaw);
        if (lastEvent?.key === currentKey && Date.now() - Number(lastEvent?.timestamp || 0) < 1000) {
          return;
        }
      }

      sessionStorage.setItem(cacheKey, JSON.stringify({ key: currentKey, timestamp: Date.now() }));
    } catch {
      // Ignore cache failures and continue tracking.
    }

    analyticsService.trackVisit({
      visitor_id: analyticsService.getVisitorId(),
      path,
      event_type: 'visit',
      book_id: null,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsTracker;