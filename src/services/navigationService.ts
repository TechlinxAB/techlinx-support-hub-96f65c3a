
import { NavigateFunction } from 'react-router-dom';

// Central navigation service to prevent redirect loops
class NavigationService {
  private static instance: NavigationService;
  private navigateFunction: NavigateFunction | null = null;
  private lastNavigationTime = 0;
  private lastNavigationPath = '';
  private navigationCount: Record<string, { count: number, firstTime: number }> = {};
  private maxNavigationsPerPath = 5; // Increased to be more tolerant
  private minNavigationInterval = 1000; // Increased to prevent rapid navigation
  private resetTimeout = 10000; // 10 seconds
  private isInitialized = false;
  
  private constructor() {
    // Private constructor to enforce singleton
    console.log('NavigationService singleton created');
  }
  
  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }
  
  public setNavigateFunction(navigate: NavigateFunction): void {
    // IMPROVED: Always update the navigate function to ensure it's fresh
    this.navigateFunction = navigate;
    this.isInitialized = true;
    console.log('NavigationService: Navigate function ' + (this.navigateFunction ? 'already set' : 'set'));
  }
  
  public isReady(): boolean {
    return this.isInitialized && this.navigateFunction !== null;
  }
  
  // Returns true if navigation was successful, false if blocked
  public navigate(to: string, options?: { replace?: boolean, state?: any }): boolean {
    if (!this.navigateFunction) {
      console.warn('Navigate function not set in NavigationService');
      
      // IMPROVED: Fallback to direct navigation when navigate function is not available
      if (typeof window !== 'undefined') {
        console.log(`Falling back to window.location for navigation to ${to}`);
        const url = to.startsWith('/') ? to : `/${to}`;
        window.location.href = url;
        return true;
      }
      
      return false;
    }
    
    const now = Date.now();
    
    // Check if this is a rapid navigation to the same path
    if (to === this.lastNavigationPath && now - this.lastNavigationTime < this.minNavigationInterval) {
      console.log(`Navigation throttled: too many rapid requests to ${to}`);
      return false;
    }
    
    // Track navigation counts per path
    if (!this.navigationCount[to]) {
      this.navigationCount[to] = { count: 0, firstTime: now };
    }
    
    // Increment count for this path
    this.navigationCount[to].count++;
    
    // Check if we're in a potential navigation loop
    if (this.navigationCount[to].count > this.maxNavigationsPerPath) {
      const timeSinceFirst = now - this.navigationCount[to].firstTime;
      
      // If too many navigations in a short time, block it
      if (timeSinceFirst < this.resetTimeout) {
        console.log(`Navigation loop detected to ${to}. Blocking navigation.`);
        
        // Reset this path's counter after blocking
        setTimeout(() => {
          if (this.navigationCount[to]) {
            this.navigationCount[to].count = 0;
            this.navigationCount[to].firstTime = now;
          }
        }, 3000); // Increased from 2000ms to 3000ms
        
        return false;
      } else {
        // Reset counter after timeout period
        this.navigationCount[to] = { count: 1, firstTime: now };
      }
    }
    
    // Update last navigation info
    this.lastNavigationTime = now;
    this.lastNavigationPath = to;
    
    // Perform navigation
    try {
      console.log(`NavigationService: Navigating to ${to}`);
      this.navigateFunction(to, options);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      
      // IMPROVED: Fallback to direct navigation on error
      if (typeof window !== 'undefined') {
        const url = to.startsWith('/') ? to : `/${to}`;
        window.location.href = url;
        return true;
      }
      
      return false;
    }
  }
  
  // Special method for hard redirects when needed
  public hardRedirect(to: string): void {
    console.log(`NavigationService: Hard redirect to ${to}`);
    if (typeof window !== 'undefined') {
      window.location.href = to;
    }
  }
  
  // Reset navigation tracking
  public resetTracking(): void {
    this.navigationCount = {};
    this.lastNavigationTime = 0;
    this.lastNavigationPath = '';
    console.log('NavigationService: Navigation tracking reset');
  }
}

export default NavigationService.getInstance();
