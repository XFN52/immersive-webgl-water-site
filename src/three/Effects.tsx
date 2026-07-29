import { useRef, type ReactElement } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Noise,
  Vignette,
  ChromaticAberration,
  SMAA,
} from '@react-three/postprocessing'
import { director } from '../lib/state'

const dofProps = {
  target: [0, 0.3, 0] as [number, number, number],
  focusDistance: 0.02,
  focalLength: 0.05,
  bokehScale: 3.5,
}
const caProps = {
  radialModulation: false,
  modulationOffset: 0,
  offset: [0.0004, 0.0004] as [number, number],
}

export default function Effects() {
  const bloom = useRef<{ intensity: number } | null>(null)

  useFrame(() => {
    if (bloom.current) bloom.current.intensity = director.bloom
  })

  const effects: ReactElement[] = [
    <Bloom
      key="bloom"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={bloom as any}
      mipmapBlur
      intensity={0.55}
      luminanceThreshold={0.62}
      luminanceSmoothing={0.18}
    />,
    <DepthOfField key="dof" {...(dofProps as object)} />,
    <Noise key="noise" premultiply opacity={0.035} />,
    <Vignette key="vignette" offset={0.35} darkness={0.75} />,
    <ChromaticAberration key="ca" {...(caProps as object)} />,
    <SMAA key="smaa" />,
  ]

  return <EffectComposer multisampling={0}>{effects}</EffectComposer>
}
