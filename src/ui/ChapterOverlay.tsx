import Chapters from './Chapters'
import ProgressRail from './ProgressRail'

export default function ChapterOverlay() {
  return (
    <>
      <ProgressRail />
      <Chapters />
    </>
  )
}

// (overlay kept as a separate component so the scene subtree never re-renders)

