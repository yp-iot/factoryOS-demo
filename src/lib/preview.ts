import { createContext, useContext } from 'react'

/** True when a screen is drawn as a small preview on its area page, not opened. */
export const PreviewContext = createContext(false)

/** Screens use this to skip things a preview must not do: change shared state, scroll the page. */
export const useIsPreview = () => useContext(PreviewContext)
