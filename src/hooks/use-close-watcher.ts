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
    const onCloseRef = useRef(onClose)

    // Keep the callback ref up to date
    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

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
                onCloseRef.current()
                watcherRef.current = null
            }
            watcherRef.current = watcher
        } else {
            // Fallback: history.pushState and popstate + Escape key
            const stateId = `watcher-${Date.now()}`
            window.history.pushState({ watcherId: stateId }, "")

            const handlePopState = () => {
                if (fallbackStack[fallbackStack.length - 1] === stateId) {
                    fallbackStack.pop()
                    isInternalClose.current = true
                    onCloseRef.current()
                    watcherRef.current = null
                }
            }

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape" && fallbackStack[fallbackStack.length - 1] === stateId) {
                    // Only trigger if we are the top-most watcher
                    window.history.back()
                }
            }

            fallbackStack.push(stateId)
            window.addEventListener("popstate", handlePopState)
            window.addEventListener("keydown", handleKeyDown)

            watcherRef.current = {
                destroy: () => {
                    window.removeEventListener("popstate", handlePopState)
                    window.removeEventListener("keydown", handleKeyDown)
                    const index = fallbackStack.indexOf(stateId)
                    if (index !== -1) {
                        fallbackStack.splice(index, 1)
                    }
                },
            }
        }

        return () => {
            // Cleanup if the component unmounts while "open"
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
    }, [isOpen])
}
