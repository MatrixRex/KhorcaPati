import { useEffect, useRef } from "react"

const fallbackStack: string[] = []

/**
 * Hook to implement the modern Close Watcher API for UI components that overlay the main screen.
 * This handles the Android system 'Back' gesture and 'Esc' key on Desktop naturally.
 * Includes a fallback for browsers that don't support CloseWatcher.
 */
export function useCloseWatcher(isOpen: boolean, onClose: () => void) {
    const watcherRef = useRef<any>(null)
    const isInternalClose = useRef(false)

    useEffect(() => {
        // We only care about initializing when it opens
        if (!isOpen) {
            if (watcherRef.current) {
                if ("CloseWatcher" in window) {
                    watcherRef.current.destroy()
                } else {
                    // Fallback cleanup
                    watcherRef.current.destroy()
                    // If closed manually (not via popstate), we might need to pop the state
                    // to keep history clean.
                    if (!isInternalClose.current) {
                        window.history.back()
                    }
                }
                watcherRef.current = null
            }
            isInternalClose.current = false
            return
        }

        // Already have a watcher for this open state
        if (watcherRef.current) return

        if ("CloseWatcher" in window) {
            const watcher = new (window as any).CloseWatcher()
            watcher.onclose = () => {
                onClose()
                watcherRef.current = null
            }
            watcherRef.current = watcher
        } else {
            // Fallback: history.pushState and popstate
            // Each modal gets its own state entry
            const stateId = `watcher-${Date.now()}`
            window.history.pushState({ watcherId: stateId }, "")

            const handlePopState = () => {
                // In the fallback, when popstate fires, we've moved BACK in history.
                // If this watcher was active, it means we likely moved from its state to the previous one.
                // Since popstate is global, we need to ensure only the one that was just popped closes.
                // We use a simple ref-check or state-check if needed, but for simplicity in a stack-like
                // history, the most recently added listener is usually the one we want to trigger
                // if we can manage it. Actually, just closing and letting the caller handle state is enough
                // IF we ensure we don't close others.

                // Better: Only trigger if this watcher's state is no longer the current one.
                // But since we just went back, none of the watchers' states will be current
                // if they were all pushed.

                // Let's use a simpler approach: only the handler for the "top" one should run.
                // We can check if we are the top of a global stack.
                if (fallbackStack[fallbackStack.length - 1] === stateId) {
                    fallbackStack.pop()
                    isInternalClose.current = true
                    onClose()
                    watcherRef.current = null
                }
            }

            fallbackStack.push(stateId)
            window.addEventListener("popstate", handlePopState)

            watcherRef.current = {
                destroy: () => {
                    window.removeEventListener("popstate", handlePopState)
                    const index = fallbackStack.indexOf(stateId)
                    if (index !== -1) {
                        fallbackStack.splice(index, 1)
                    }
                },
            }
        }

        return () => {
            // Cleanup if the component unmounts while "open" (though usually isOpen would change first)
            if (watcherRef.current) {
                if ("CloseWatcher" in window) {
                    watcherRef.current.destroy()
                } else {
                    watcherRef.current.destroy()
                    if (!isInternalClose.current) {
                        window.history.back()
                    }
                }
                watcherRef.current = null
            }
        }
    }, [isOpen, onClose])
}
