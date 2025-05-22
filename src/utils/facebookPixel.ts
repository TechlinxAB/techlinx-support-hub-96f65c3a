
/**
 * Facebook Pixel utility functions for tracking events
 */
export const fbPixel = {
  /**
   * Track a custom event
   * @param eventName The name of the event to track
   * @param params Optional parameters for the event
   */
  trackEvent: (eventName: string, params?: Record<string, any>) => {
    if (window.fbq) {
      window.fbq('track', eventName, params);
    }
  },
  
  /**
   * Track a page view
   * @param pageTitle Optional page title
   */
  trackPageView: (pageTitle?: string) => {
    if (window.fbq) {
      window.fbq('track', 'PageView', { page_title: pageTitle });
    }
  }
};

// Add fbq to window type
declare global {
  interface Window {
    fbq: any;
  }
}
