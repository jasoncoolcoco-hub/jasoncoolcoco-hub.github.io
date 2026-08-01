import SideNavigation from '../SideNavigation'
import { footprintsSceneStates } from './footprintsSceneState'

export default function ChapterNavigation({
  chapters,
  navigation,
  reducedMotion,
  sceneState,
}) {
  const isBeingCovered =
    sceneState === footprintsSceneStates.ENTERING_MEMORY

  return (
    <div
      className="footprints-navigation-layer"
      data-being-covered={isBeingCovered ? 'true' : 'false'}
    >
      <SideNavigation
        chapters={chapters}
        navigation={navigation}
        reducedMotion={reducedMotion}
        activeChapterId="footprints"
      />
    </div>
  )
}
