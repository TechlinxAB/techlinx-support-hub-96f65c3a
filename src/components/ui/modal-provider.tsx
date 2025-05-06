
import * as React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"

// Define the context type
type ModalContextType = {
  isModalOpen: boolean
  isLoading: boolean
  setIsModalOpen: (open: boolean) => void
  setIsLoading: (loading: boolean) => void
  forceResetModalState: () => void
  registerModalInstance: (id: string) => void
  unregisterModalInstance: (id: string) => void
  activeModals: string[]
}

// Create context with default values
const ModalContext = createContext<ModalContextType>({
  isModalOpen: false,
  isLoading: false,
  setIsModalOpen: () => {},
  setIsLoading: () => {},
  forceResetModalState: () => {},
  registerModalInstance: () => {},
  unregisterModalInstance: () => {},
  activeModals: []
})

// Custom hook to use the modal context
export const useModal = () => useContext(ModalContext)

// Provider component
export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeModals, setActiveModals] = useState<string[]>([])
  const originalBodyStyle = useRef<{
    overflow: string;
    position: string;
    top: string;
    width: string;
  } | null>(null)

  // Track scroll position when locking body
  const scrollY = useRef<number>(0)

  // Force reset function to clear all modal state
  const forceResetModalState = useCallback(() => {
    // Restore scroll position when unlocking the body
    if (scrollY.current !== null && originalBodyStyle.current) {
      if (document.body.style.top) {
        window.scrollTo(0, scrollY.current);
      }
    }

    // Reset all state variables
    setIsModalOpen(false)
    setIsLoading(false)
    setActiveModals([])
    
    // Reset body styles to original values
    if (originalBodyStyle.current) {
      document.body.style.overflow = originalBodyStyle.current.overflow || ''
      document.body.style.position = originalBodyStyle.current.position || ''
      document.body.style.top = originalBodyStyle.current.top || ''
      document.body.style.width = originalBodyStyle.current.width || ''
    } else {
      // Default cleanup if original values weren't captured
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
    
    // Remove all modal-related attributes
    document.body.removeAttribute('data-modal-open')
    document.body.removeAttribute('data-loading')
    
    console.log('Modal state forcefully reset')
  }, [])

  // Register and unregister modal instances
  const registerModalInstance = useCallback((id: string) => {
    setActiveModals(prev => [...prev, id])
  }, [])

  const unregisterModalInstance = useCallback((id: string) => {
    setActiveModals(prev => {
      const newModals = prev.filter(modalId => modalId !== id)
      
      // If this was the last modal, perform cleanup
      if (newModals.length === 0 && prev.length > 0) {
        // Use setTimeout to ensure this runs after state updates
        setTimeout(() => {
          if (document.querySelectorAll('[role="dialog"]').length === 0) {
            forceResetModalState()
          }
        }, 100)
      }
      
      return newModals
    })
  }, [forceResetModalState])

  // Save original body styles once on initial render
  useEffect(() => {
    // Capture original body styles once on mount
    if (!originalBodyStyle.current) {
      const computedStyle = window.getComputedStyle(document.body)
      originalBodyStyle.current = {
        overflow: computedStyle.overflow,
        position: computedStyle.position,
        top: computedStyle.top,
        width: computedStyle.width
      }
    }
    
    // Global safety timeout in case something goes wrong
    const safetyInterval = setInterval(() => {
      // If there are no visible dialogs but modal state is still active, reset
      const visibleDialogs = document.querySelectorAll('[role="dialog"]')
      if (visibleDialogs.length === 0 && (isModalOpen || document.body.hasAttribute('data-modal-open'))) {
        forceResetModalState()
      }
    }, 5000)
    
    return () => {
      clearInterval(safetyInterval)
      forceResetModalState()
    }
  }, [forceResetModalState])

  // Handle body styles when modal state changes
  useEffect(() => {
    if (isModalOpen) {
      // Save the current scroll position before locking
      scrollY.current = window.scrollY
      
      // Apply fixed position to lock scrolling
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY.current}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      document.body.setAttribute('data-modal-open', 'true')
    } else {
      // Don't reset if there are still active modals
      if (activeModals.length === 0) {
        // Restore position and scroll
        if (document.body.style.top) {
          const scrollYValue = parseInt(document.body.style.top || '0', 10) * -1
          
          // Clear styles first
          document.body.style.position = originalBodyStyle.current?.position || ''
          document.body.style.top = ''
          document.body.style.width = ''
          document.body.style.overflow = originalBodyStyle.current?.overflow || ''
          document.body.removeAttribute('data-modal-open')
          
          // Then restore scroll position
          window.scrollTo(0, scrollYValue)
        } else {
          // Just clear styles if top wasn't set
          document.body.style.position = originalBodyStyle.current?.position || ''
          document.body.style.top = ''
          document.body.style.width = ''
          document.body.style.overflow = originalBodyStyle.current?.overflow || ''
          document.body.removeAttribute('data-modal-open')
        }
      }
    }
    
    // Safety cleanup on component unmount
    return () => {
      if (!isModalOpen && activeModals.length === 0) {
        document.body.removeAttribute('data-modal-open')
        document.body.style.position = originalBodyStyle.current?.position || ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = originalBodyStyle.current?.overflow || ''
      }
    }
  }, [isModalOpen, activeModals])

  // Update the body's data attributes when loading state changes
  useEffect(() => {
    if (isLoading) {
      document.body.setAttribute('data-loading', 'true')
    } else {
      document.body.removeAttribute('data-loading')
    }
    
    // Safety cleanup on component unmount
    return () => {
      document.body.removeAttribute('data-loading')
    }
  }, [isLoading])

  // Safety timeout to reset loading state if it gets stuck
  useEffect(() => {
    if (isLoading) {
      const safetyTimer = setTimeout(() => {
        setIsLoading(false)
        document.body.removeAttribute('data-loading')
      }, 10000) // 10 second safety timeout

      return () => {
        clearTimeout(safetyTimer)
      }
    }
  }, [isLoading])

  // Global event listener to ensure cleanup on user interactions
  useEffect(() => {
    const handleUserInteraction = () => {
      // Check for stale modal state
      const visibleDialogs = document.querySelectorAll('[role="dialog"]')
      
      // If no visible dialogs but modal state is active, reset it
      if (visibleDialogs.length === 0 && (isModalOpen || document.body.hasAttribute('data-modal-open'))) {
        forceResetModalState()
      }
    }
    
    // Add event listeners for user interactions
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)
    
    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [isModalOpen, forceResetModalState])

  // Double ESC key detection for emergency reset
  useEffect(() => {
    let lastEscTime = 0
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const now = Date.now()
        
        // If ESC is pressed twice within 500ms, force reset
        if (now - lastEscTime < 500) {
          forceResetModalState()
          event.preventDefault()
          event.stopPropagation()
        }
        
        lastEscTime = now
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [forceResetModalState])

  // Create context value
  const value = {
    isModalOpen,
    isLoading,
    setIsModalOpen,
    setIsLoading,
    forceResetModalState,
    registerModalInstance,
    unregisterModalInstance,
    activeModals
  }

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

// Custom hook that wraps operations in loading state
export const useLoadingOperation = () => {
  const { setIsLoading } = useModal()
  
  const withLoading = async <T extends any>(operation: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true)
      return await operation()
    } finally {
      // Remove delay - set back to false immediately
      setIsLoading(false)
    }
  }
  
  return { withLoading }
}

// Utility hook for managing modal instances
export const useModalInstance = (id: string) => {
  const { registerModalInstance, unregisterModalInstance } = useModal()
  
  useEffect(() => {
    const uniqueId = `${id}-${Math.random().toString(36).substring(2, 9)}`
    registerModalInstance(uniqueId)
    
    return () => {
      unregisterModalInstance(uniqueId)
    }
  }, [id, registerModalInstance, unregisterModalInstance])
}
