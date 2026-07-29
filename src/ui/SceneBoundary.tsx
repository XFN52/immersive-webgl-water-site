import { Component, type ReactNode } from 'react'

interface Props {
  onError: () => void
  children: ReactNode
}

// If the 3D scene throws during render/commit, swap the whole page
// to the static fallback instead of leaving a black canvas.
export default class SceneBoundary extends Component<Props, { err: boolean }> {
  state = { err: false }

  static getDerivedStateFromError() {
    return { err: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    if (this.state.err) return null
    return this.props.children
  }
}
