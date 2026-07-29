import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Deterministic value noise (pure function of position → identical results for
// shared seams, so neighbouring shards close without gaps).
// ---------------------------------------------------------------------------

function hash3(ix: number, iy: number, iz: number): number {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453123
  return s - Math.floor(s)
}
const fade = (t: number) => t * t * (3 - 2 * t)
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t

function vnoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const u = fade(x - ix)
  const v = fade(y - iy)
  const w = fade(z - iz)
  const c000 = hash3(ix, iy, iz)
  const c100 = hash3(ix + 1, iy, iz)
  const c010 = hash3(ix, iy + 1, iz)
  const c110 = hash3(ix + 1, iy + 1, iz)
  const c001 = hash3(ix, iy, iz + 1)
  const c101 = hash3(ix + 1, iy, iz + 1)
  const c011 = hash3(ix, iy + 1, iz + 1)
  const c111 = hash3(ix + 1, iy + 1, iz + 1)
  return lerpN(
    lerpN(lerpN(c000, c100, u), lerpN(c010, c110, u), v),
    lerpN(lerpN(c001, c101, u), lerpN(c011, c111, u), v),
    w
  )
}

function fbm(x: number, y: number, z: number, oct = 4): number {
  let amp = 0.5
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * freq, y * freq, z * freq)
    norm += amp
    amp *= 0.5
    freq *= 2.02
  }
  return sum / norm
}

// ---------------------------------------------------------------------------
// The monolith as a parametric surface — every shard derives from these,
// so closed-state seams are exact.
// ---------------------------------------------------------------------------

const SECTORS = 6
const PHI_T = 0.5 // body / cap split (radians from the top pole)
const PHI_B = Math.PI - 0.22 // bottom of the body

const _dir = new THREE.Vector3()

function surfacePoint(theta: number, phi: number, out: THREE.Vector3): THREE.Vector3 {
  const s = Math.sin(phi)
  _dir.set(s * Math.cos(theta), Math.cos(phi), s * Math.sin(theta))
  const n = fbm(_dir.x * 2.15 + 7.3, _dir.y * 2.15 + 2.1, _dir.z * 2.15 + 4.7, 4)
  const ridge = fbm(_dir.x * 5.8 + 1.7, _dir.y * 5.8 + 9.2, _dir.z * 5.8 + 3.3, 3)
  const micro = fbm(_dir.x * 9.6 + 4.2, _dir.y * 9.6 + 6.9, _dir.z * 9.6 + 8.4, 2)
  const r = 1 + (n - 0.5) * 0.52 + (ridge - 0.5) * 0.16 + (micro - 0.5) * 0.06
  out.copy(_dir).multiplyScalar(r)
  const taper = 1 - Math.max(0, _dir.y) * 0.16
  out.x *= 0.88 * taper
  out.z *= 0.88 * taper
  out.y *= 1.62
  return out
}

// Inner wall of a shard (bottle cavity): a shrunk copy of the crust with
// its own jitter. Kept ~0.4+ from the axis so the bottle never clips through.
function innerPoint(theta: number, phi: number, out: THREE.Vector3): THREE.Vector3 {
  surfacePoint(theta, phi, out)
  const kxz = 0.62 + (fbm(out.x * 2.6 + 11.5, out.y * 2.6 + 1.2, out.z * 2.6 + 7.7, 3) - 0.5) * 0.18
  const ky = 0.93 + (fbm(out.x * 2.6 + 3.3, out.y * 2.6 + 8.8, out.z * 2.6 + 5.1, 3) - 0.5) * 0.07
  out.x *= kxz
  out.z *= kxz
  out.y *= ky
  const rq = Math.hypot(out.x, out.z)
  if (rq < 0.4 && rq > 1e-5) {
    const k = 0.4 / rq
    out.x *= k
    out.z *= k
  }
  return out
}

function fractureJitter(p: THREE.Vector3, seed: number, amp: number) {
  const j1 = fbm(p.x * 4.1 + seed, p.y * 4.1 + 2.2, p.z * 4.1 + seed * 1.7, 2) - 0.5
  const j2 = fbm(p.x * 5.3 + 8.1 + seed, p.y * 5.3 + 6.3, p.z * 5.3 + seed, 2) - 0.5
  p.x += j1 * amp
  p.z += j1 * amp
  p.y += j2 * amp * 0.8
}

// ---------------------------------------------------------------------------
// Solid shard builder.
// Each patch (a small grid of Vector3) is emitted with its own vertices;
// patches are not welded together, so fracture faces keep crisp edges
// while the crust stays smooth inside itself.
// ---------------------------------------------------------------------------

type Grid = THREE.Vector3[][]

interface PatchSet {
  outer: Grid
  inner: Grid
  sides: Grid[]
  rings: Grid[]
}

function emitPatch(
  grid: Grid,
  pos: number[],
  idx: number[],
  flip: boolean
): void {
  const nv = grid.length - 1
  if (nv < 1) return
  const nu = grid[0].length - 1
  if (nu < 1) return
  const base: number[] = []
  for (const row of grid) {
    for (const p of row) {
      pos.push(p.x, p.y, p.z)
      base.push(pos.length / 3 - 1)
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = base[j * (nu + 1) + i]
      const b = base[j * (nu + 1) + i + 1]
      const c = base[(j + 1) * (nu + 1) + i]
      const d = base[(j + 1) * (nu + 1) + i + 1]
      if (flip) idx.push(a, b, d, a, d, c)
      else idx.push(a, c, d, a, d, b)
    }
  }
}

function buildSolidShard(
  patches: PatchSet,
  isCap: boolean
): { geo: THREE.BufferGeometry; centroid: THREE.Vector3 } {
  const pos: number[] = []
  const idxIce: number[] = []
  const idxFrac: number[] = []

  emitPatch(patches.outer, pos, idxIce, false) // smooth crust
  emitPatch(patches.inner, pos, idxFrac, true) // faces the bottle cavity
  for (const s of patches.sides) emitPatch(s, pos, idxFrac, false)
  for (const r of patches.rings) emitPatch(r, pos, idxFrac, true)

  if (isCap) {
    // sheared underside disk that closes the top chunk
    const NU = 42
    const tmp = new THREE.Vector3()
    const head = pos.length / 3
    for (let i = 0; i < NU; i++) {
      const theta = (i / NU) * Math.PI * 2
      surfacePoint(theta, PHI_T, tmp)
      const shrink = 0.8 + (fbm(tmp.x * 3.1 + 5.5, tmp.y * 3.1 + 0.4, tmp.z * 3.1 + 9.9, 2) - 0.5) * 0.16
      tmp.multiplyScalar(shrink)
      tmp.y = tmp.y * 0.82 + (fbm(tmp.x * 5.2, tmp.y * 5.2 + 3.7, tmp.z * 5.2 + 1.8, 2) - 0.5) * 0.12
      pos.push(tmp.x, tmp.y, tmp.z)
    }
    const center = pos.length / 3
    pos.push(0, 1.02, 0)
    for (let i = 0; i < NU; i++) {
      idxFrac.push(center, head + ((i + 1) % NU), head + i)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  const index = [...idxIce, ...idxFrac]
  geo.setIndex(index)
  geo.addGroup(0, idxIce.length, 0)
  geo.addGroup(idxIce.length, idxFrac.length, 1)

  const c = new THREE.Vector3()
  const n = pos.length / 3
  for (let i = 0; i < pos.length; i += 3) {
    c.x += pos[i]
    c.y += pos[i + 1]
    c.z += pos[i + 2]
  }
  c.multiplyScalar(1 / n)
  geo.translate(-c.x, -c.y, -c.z)
  geo.computeVertexNormals()
  return { geo, centroid: c }
}

// ---------------------------------------------------------------------------
// Interface + assembly
// ---------------------------------------------------------------------------

export interface IceFragment {
  geometry: THREE.BufferGeometry
  centroid: THREE.Vector3 // rest position inside the monolith
  dir: THREE.Vector3 // escape direction (from monolith centre)
  axis: THREE.Vector3 // tumble axis
  spin: number
  spinSign: number
  cap: boolean
  bubbles: Float32Array // trapped air: packs of [x, y, z, size] in local frame
}

// Trapped air bubbles scattered through the shard's ice volume
// (between the crust and the bottle cavity) — what makes real glacier
// ice sparkle against the light.
function buildBubbles(
  k: number,
  cap: boolean,
  centroid: THREE.Vector3,
  count: number
): Float32Array {
  const out = new Float32Array(count * 4)
  const o = new THREE.Vector3()
  const iw = new THREE.Vector3()
  const p = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const r1 = hash3(i, k, 101)
    const r2 = hash3(i, k, 203)
    const r3 = hash3(i, k, 307)
    const r4 = hash3(i, k, 401)
    let theta: number
    let phi: number
    if (!cap) {
      const a0 = -Math.PI + (k / SECTORS) * Math.PI * 2
      const a1 = -Math.PI + ((k + 1) / SECTORS) * Math.PI * 2
      theta = a0 + (0.06 + r1 * 0.88) * (a1 - a0)
      phi = PHI_T + (0.04 + r2 * 0.88) * (PHI_B - PHI_T)
    } else {
      theta = r1 * Math.PI * 2
      phi = 0.1 + r2 * (PHI_T - 0.14)
    }
    const t = 0.15 + r3 * 0.65
    surfacePoint(theta, phi, o)
    innerPoint(theta, phi, iw)
    p.lerpVectors(iw, o, t)
    p.sub(centroid)
    out[i * 4] = p.x
    out[i * 4 + 1] = p.y
    out[i * 4 + 2] = p.z
    out[i * 4 + 3] = 0.007 + r4 * r4 * 0.026
  }
  return out
}

// Solid ice shards: 6 wedge chunks + 1 top chunk — real volumes with crust,
// fracture planes and an inner cavity for the bottle (no hollow shells).
// Material groups: 0 = outer crust, 1 = fracture faces (milky crushed ice).
export function buildIceMonolith(): IceFragment[] {
  const fragments: IceFragment[] = []
  const _o = new THREE.Vector3()
  const _i = new THREE.Vector3()

  for (let k = 0; k < SECTORS + 1; k++) {
    const cap = k === SECTORS
    let patches: PatchSet

    if (!cap) {
      const a0 = -Math.PI + (k / SECTORS) * Math.PI * 2
      const a1 = -Math.PI + ((k + 1) / SECTORS) * Math.PI * 2
      const NU = 20
      const NV = 24

      const outer: Grid = []
      const inner: Grid = []
      for (let j = 0; j <= NV; j++) {
        const phi = PHI_T + (j / NV) * (PHI_B - PHI_T)
        const rowO: THREE.Vector3[] = []
        const rowI: THREE.Vector3[] = []
        for (let i = 0; i <= NU; i++) {
          const theta = a0 + (i / NU) * (a1 - a0)
          rowO.push(surfacePoint(theta, phi, new THREE.Vector3()))
          rowI.push(innerPoint(theta, phi, new THREE.Vector3()))
        }
        outer.push(rowO)
        inner.push(rowI)
      }

      const sides: Grid[] = []
      for (const theta of [a0, a1]) {
        const side: Grid = []
        for (let j = 0; j <= NV; j++) {
          const phi = PHI_T + (j / NV) * (PHI_B - PHI_T)
          const row: THREE.Vector3[] = []
          surfacePoint(theta, phi, _o)
          innerPoint(theta, phi, _i)
          for (let s = 0; s <= 5; s++) {
            const t = s / 5
            const p = new THREE.Vector3().lerpVectors(_o, _i, t)
            fractureJitter(p, theta + j * 0.7 + 13.1, Math.sin(Math.PI * t) * 0.07)
            row.push(p)
          }
          side.push(row)
        }
        sides.push(side)
      }

      const rings: Grid[] = []
      for (const phi of [PHI_T, PHI_B]) {
        const ring: Grid = []
        for (let s = 0; s <= 3; s++) {
          const t = s / 3
          const row: THREE.Vector3[] = []
          for (let i = 0; i <= NU; i++) {
            const theta = a0 + (i / NU) * (a1 - a0)
            surfacePoint(theta, phi, _o)
            innerPoint(theta, phi, _i)
            const p = new THREE.Vector3().lerpVectors(_o, _i, t)
            fractureJitter(p, phi + i * 0.3 + 7.7, Math.sin(Math.PI * t) * 0.06)
            row.push(p)
          }
          ring.push(row)
        }
        rings.push(ring)
      }

      patches = { outer, inner, sides, rings }
    } else {
      const NU = 42
      const NV = 9
      const outer: Grid = []
      for (let j = 0; j <= NV; j++) {
        const phi = 0.04 + (j / NV) * (PHI_T - 0.04)
        const row: THREE.Vector3[] = []
        for (let i = 0; i <= NU; i++) {
          row.push(surfacePoint((i / NU) * Math.PI * 2, phi, new THREE.Vector3()))
        }
        outer.push(row)
      }
      patches = { outer, inner: [], sides: [], rings: [] }
    }

    const { geo, centroid } = buildSolidShard(patches, cap)

    fragments.push({
      geometry: geo,
      centroid: centroid.clone(),
      bubbles: buildBubbles(k, cap, centroid, cap ? 30 : 52),
      dir: cap
        ? new THREE.Vector3(0.22, 1, -0.14).normalize()
        : new THREE.Vector3(centroid.x, centroid.y * 0.22, centroid.z).normalize(),
      axis: new THREE.Vector3(
        hash3(k, 3, 9) - 0.5,
        hash3(k, 7, 1) - 0.5,
        hash3(k, 5, 4) - 0.5
      ).normalize(),
      spin: 0.55 + hash3(k, 11, 2) * 1.1,
      spinSign: hash3(k, 13, 6) > 0.5 ? 1 : -1,
      cap,
    })
  }

  return fragments
}
