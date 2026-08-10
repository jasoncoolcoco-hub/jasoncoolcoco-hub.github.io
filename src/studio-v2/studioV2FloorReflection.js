import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

const FLOOR_MATERIAL_NAME = 'Material.002'
const REFLECTION_TEXTURE_SIZE = Object.freeze([512, 320])
const BLUR_TEXTURE_SIZE = Object.freeze([256, 160])
const REFLECTION_UPDATE_RATES = Object.freeze({
  SLOW: 12,
  ORBIT: 20,
  FAST: 22,
})
const BLUR_SAMPLE_OFFSET = 6

const PHYSICAL_FLOOR = Object.freeze({
  roughness: 0.32,
  clearcoat: 0.14,
  clearcoatRoughness: 0.34,
  envMapIntensity: 1,
  metalness: 0,
})

export const STUDIO_V2_FLOOR_ARCHITECTURES = Object.freeze({
  MATERIAL_ONLY: Object.freeze({
    label: 'A / MATERIAL ONLY',
    category: 'A',
    mode: 'MATERIAL_ONLY_PHYSICAL',
    ...PHYSICAL_FLOOR,
    planarReflection: false,
  }),
  CURRENT_C2: Object.freeze({
    label: 'CURRENT C2 / STAGE 3.3',
    category: 'C',
    mode: 'INTEGRATED_OPAQUE',
    ...PHYSICAL_FLOOR,
    f0: 0.04,
    reflectionStrength: 0.13,
    normalDistortionTexels: 1.5,
    lowLuminanceContribution: 0.52,
    highLuminanceContribution: 1.08,
    basePolish: 0,
    lowerLuminanceThreshold: 0.16,
    upperLuminanceThreshold: 0.72,
    finalWeightClamp: 0.28,
    weightModel: 'STAGE3_3_SINGLE_LOBE',
    planarReflection: true,
  }),
  FINAL_C2_5: Object.freeze({
    label: 'FINAL C2.5 / BALANCED ART',
    category: 'C',
    mode: 'INTEGRATED_OPAQUE',
    ...PHYSICAL_FLOOR,
    f0: 0.04,
    reflectionStrength: 0.16,
    normalDistortionTexels: 1.2,
    lowLuminanceContribution: 0.3,
    highLuminanceContribution: 1.24,
    basePolish: 0.022,
    lowerLuminanceThreshold: 0.2,
    upperLuminanceThreshold: 0.62,
    finalWeightClamp: 0.27,
    weightModel: 'TWO_LOBE',
    planarReflection: true,
  }),
  FINAL_C3: Object.freeze({
    label: 'FINAL C3 / UPPER BOUND',
    category: 'C',
    mode: 'INTEGRATED_OPAQUE',
    ...PHYSICAL_FLOOR,
    f0: 0.04,
    reflectionStrength: 0.18,
    normalDistortionTexels: 1.25,
    lowLuminanceContribution: 0.32,
    highLuminanceContribution: 1.24,
    basePolish: 0.025,
    lowerLuminanceThreshold: 0.18,
    upperLuminanceThreshold: 0.6,
    finalWeightClamp: 0.28,
    weightModel: 'TWO_LOBE',
    planarReflection: true,
  }),
})

export const STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE = 'FINAL_C2_5'

export const STUDIO_V2_REFLECTION_DIAGNOSTIC_MODES = Object.freeze({
  FINAL_COMBINED: 'FINAL COMBINED',
  RAW_SOURCE: 'RAW REFLECTION SOURCE',
  SOURCE_VALIDITY: 'SOURCE VALIDITY + FLOOR UV',
  BLURRED_TARGET: 'FINAL BLURRED REFLECTION',
  WEIGHT_MASK: 'REFLECTION WEIGHT MASK',
  SHADOW_ONLY: 'TRUE SHADOW ONLY',
  REFLECTION_ONLY_TEST: 'REFLECTION ONLY FLOOR TEST',
})

const GAUSSIAN_BLUR_SHADER = {
  uniforms: {
    direction: { value: new THREE.Vector2() },
    tDiffuse: { value: null },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 direction;
    varying vec2 vUv;

    vec4 sampleReflection(vec2 offset) {
      vec2 sampleUv = clamp(vUv + offset, vec2(0.0), vec2(1.0));
      return texture2D(tDiffuse, sampleUv);
    }

    void main() {
      vec4 taps[9];
      taps[0] = sampleReflection(vec2(0.0));
      taps[1] = sampleReflection(direction * 1.0);
      taps[2] = sampleReflection(-direction * 1.0);
      taps[3] = sampleReflection(direction * 2.0);
      taps[4] = sampleReflection(-direction * 2.0);
      taps[5] = sampleReflection(direction * 3.0);
      taps[6] = sampleReflection(-direction * 3.0);
      taps[7] = sampleReflection(direction * 4.0);
      taps[8] = sampleReflection(-direction * 4.0);
      float weights[9];
      weights[0] = 0.2270270270;
      weights[1] = 0.1945945946;
      weights[2] = 0.1945945946;
      weights[3] = 0.1216216216;
      weights[4] = 0.1216216216;
      weights[5] = 0.0540540541;
      weights[6] = 0.0540540541;
      weights[7] = 0.0162162162;
      weights[8] = 0.0162162162;
      vec3 weightedColour = vec3(0.0);
      float validWeight = 0.0;
      for (int index = 0; index < 9; index++) {
        float sampleWeight = taps[index].a * weights[index];
        weightedColour += taps[index].rgb * sampleWeight;
        validWeight += sampleWeight;
      }
      gl_FragColor = vec4(
        weightedColour / max(validWeight, 0.0001),
        clamp(validWeight, 0.0, 1.0)
      );
    }
  `,
}

const DEBUG_TEXTURE_SHADER = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(tDiffuse, vUv);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}

const SOURCE_VALIDITY_SHADER = {
  uniforms: {
    projectedBounds: { value: new THREE.Vector4(0, 0, 1, 1) },
    tDiffuse: { value: null },
  },
  vertexShader: DEBUG_TEXTURE_SHADER.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec4 projectedBounds;
    varying vec2 vUv;
    void main() {
      vec3 source = texture2D(tDiffuse, vUv).rgb;
      float insideX = step(projectedBounds.x, vUv.x) * step(vUv.x, projectedBounds.z);
      float insideY = step(projectedBounds.y, vUv.y) * step(vUv.y, projectedBounds.w);
      float inside = insideX * insideY;
      float borderX = 1.0 - step(0.004, min(abs(vUv.x - projectedBounds.x), abs(vUv.x - projectedBounds.z)));
      float borderY = 1.0 - step(0.004, min(abs(vUv.y - projectedBounds.y), abs(vUv.y - projectedBounds.w)));
      float border = inside * max(borderX, borderY);
      float invalidBlack = inside * (1.0 - step(0.008, max(source.r, max(source.g, source.b))));
      vec3 colour = mix(source, source + vec3(0.0, 0.08, 0.02), inside * 0.45);
      colour = mix(colour, vec3(0.48, 0.02, 0.02), invalidBlack * 0.72);
      colour = mix(colour, vec3(1.0, 0.78, 0.05), border);
      gl_FragColor = vec4(colour, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
}

const PROJECTED_UV_AUDIT_SHADER = {
  uniforms: {},
  vertexShader: /* glsl */`
    varying vec4 vProjectedClip;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vProjectedClip = gl_Position;
    }
  `,
  fragmentShader: /* glsl */`
    varying vec4 vProjectedClip;
    void main() {
      vec2 vProjectedUv = vProjectedClip.xy / vProjectedClip.w * 0.5 + 0.5;
      gl_FragColor = vec4(vProjectedUv, 1.0, 1.0);
    }
  `,
}

function matrixDelta(current, previous) {
  return current.elements.reduce((maximum, value, index) => (
    Math.max(maximum, Math.abs(value - previous.elements[index]))
  ), 0)
}

function findFloorMesh(root) {
  let result = null
  root.traverse((object) => {
    if (result || !object.isMesh || !object.visible) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    if (materials.some((material) => material?.name === FLOOR_MATERIAL_NAME)) result = object
  })
  return result
}

function matrixChanged(current, previous, epsilon = 0.001) {
  return current.elements.some((value, index) => (
    Math.abs(value - previous.elements[index]) > epsilon
  ))
}

function createLinearBlurTarget(width, height) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.LinearSRGBColorSpace,
    depthBuffer: false,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    samples: 0,
    stencilBuffer: false,
    type: THREE.HalfFloatType,
  })
  target.texture.generateMipmaps = false
  return target
}

function createPhysicalFloorMaterial(source, name, values, { neutral = false } = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    alphaMap: source.alphaMap,
    alphaTest: source.alphaTest,
    aoMap: source.aoMap,
    aoMapIntensity: source.aoMapIntensity,
    color: neutral ? '#777777' : source.color?.clone() ?? new THREE.Color('#a3a3a0'),
    clearcoat: values.clearcoat,
    clearcoatRoughness: values.clearcoatRoughness,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    displacementBias: source.displacementBias,
    displacementMap: source.displacementMap,
    displacementScale: source.displacementScale,
    emissive: source.emissive?.clone() ?? new THREE.Color(0x000000),
    emissiveIntensity: source.emissiveIntensity,
    emissiveMap: source.emissiveMap,
    envMapIntensity: values.envMapIntensity,
    flatShading: source.flatShading,
    fog: source.fog,
    lightMap: source.lightMap,
    lightMapIntensity: source.lightMapIntensity,
    map: neutral ? null : source.map,
    metalness: values.metalness,
    metalnessMap: source.metalnessMap,
    normalMap: source.normalMap,
    normalMapType: source.normalMapType,
    normalScale: source.normalScale?.clone(),
    opacity: 1,
    roughness: values.roughness,
    roughnessMap: source.roughnessMap,
    side: source.side,
    toneMapped: source.toneMapped,
    transparent: false,
    vertexColors: source.vertexColors,
  })
  material.name = name
  material.userData = { ...source.userData, studioV2FloorCandidate: name }
  return material
}

function installIntegratedReflection(material, uniforms) {
  const inheritedOnBeforeCompile = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    inheritedOnBeforeCompile?.(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        'varying vec3 vViewPosition;',
        `varying vec3 vViewPosition;
varying vec4 vStudioReflectionClip;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vStudioReflectionClip = gl_Position;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'varying vec3 vViewPosition;',
        `varying vec3 vViewPosition;
varying vec4 vStudioReflectionClip;
uniform sampler2D studioReflectionTexture;
uniform vec2 studioReflectionTexelSize;
uniform float studioReflectionEnabled;
uniform float studioReflectionStrength;
uniform float studioReflectionF0;
uniform float studioFloorRoughness;
uniform float studioNormalDistortionTexels;
uniform float studioLowLuminanceContribution;
uniform float studioHighLuminanceContribution;
uniform float studioBasePolish;
uniform float studioLowerLuminanceThreshold;
uniform float studioUpperLuminanceThreshold;
uniform float studioFinalWeightClamp;
uniform float studioTwoLobeWeight;
uniform float studioReflectionWeightMask;
uniform float studioReflectionOnlyTest;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `vec2 studioReflectionUv = vStudioReflectionClip.xy
  / max(vStudioReflectionClip.w, 0.0001)
  * 0.5
  + 0.5;
vec3 studioWorldNormal = inverseTransformDirection(normalize(normal), viewMatrix);
studioReflectionUv += studioWorldNormal.xz
  * studioReflectionTexelSize
  * studioNormalDistortionTexels;
vec3 studioReflectedLight = texture2D(studioReflectionTexture, studioReflectionUv).rgb;
float studioLuminance = dot(studioReflectedLight, vec3(0.2126, 0.7152, 0.0722));
float studioHighlight = smoothstep(
  studioLowerLuminanceThreshold,
  studioUpperLuminanceThreshold,
  studioLuminance
);
float studioLuminanceWeight = mix(
  studioLowLuminanceContribution,
  studioHighLuminanceContribution,
  studioHighlight
);
float studioNoV = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
float studioFresnel = studioReflectionF0
  + (1.0 - studioReflectionF0) * pow(1.0 - studioNoV, 5.0);
float studioNormalizedFresnel = clamp(
  (studioFresnel - studioReflectionF0) / max(1.0 - studioReflectionF0, 0.0001),
  0.0,
  1.0
);
float studioViewResponse = mix(0.72, 1.0, studioNormalizedFresnel);
float studioRoughnessAttenuation = 1.0
  - clamp(studioFloorRoughness, 0.0, 0.95) * 0.45;
float studioLegacyWeight = studioReflectionStrength * studioLuminanceWeight;
float studioBasePolishLobe = studioBasePolish * mix(0.82, 1.0, studioNormalizedFresnel);
float studioHighlightLobe = studioReflectionStrength
  * studioHighlight
  * studioLuminanceWeight;
float studioArtWeight = studioBasePolishLobe + studioHighlightLobe;
float studioReflectionWeight = clamp(
  studioReflectionEnabled
    * mix(studioLegacyWeight, studioArtWeight, studioTwoLobeWeight)
    * studioRoughnessAttenuation
    * studioViewResponse,
  0.0,
  studioFinalWeightClamp
);
if (studioReflectionWeightMask > 0.5) {
  outgoingLight = vec3(pow(studioReflectionWeight, 0.55));
} else if (studioReflectionOnlyTest > 0.5) {
  outgoingLight = mix(vec3(0.34), studioReflectedLight, clamp(studioReflectionWeight * 2.5, 0.0, 0.62));
} else {
  outgoingLight = mix(outgoingLight, studioReflectedLight, studioReflectionWeight);
}
#include <opaque_fragment>`,
      )
    material.userData.studioV2CompiledShader = shader
  }
  material.customProgramCacheKey = () => 'studio-v2-integrated-floor-reflection-v2'
  material.needsUpdate = true
}

export function createStudioV2FloorReflection({
  architecture = STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE,
  debug = false,
  diagnosticMode = 'FINAL_COMBINED',
  enabled = true,
  root,
}) {
  const floor = findFloorMesh(root)
  if (!floor) return null
  root.updateMatrixWorld(true)

  const sourceFloorMaterial = Array.isArray(floor.material) ? floor.material[0] : floor.material
  const [textureWidth, textureHeight] = REFLECTION_TEXTURE_SIZE
  const [blurWidth, blurHeight] = BLUR_TEXTURE_SIZE
  const reflector = new Reflector(floor.geometry, {
    clipBias: 0.0025,
    multisample: 0,
    textureHeight,
    textureWidth,
    type: THREE.HalfFloatType,
  })
  const reflectionTarget = reflector.getRenderTarget()
  reflectionTarget.texture.colorSpace = THREE.LinearSRGBColorSpace
  reflectionTarget.texture.generateMipmaps = false
  const blurTargetA = createLinearBlurTarget(blurWidth, blurHeight)
  const blurTargetB = createLinearBlurTarget(blurWidth, blurHeight)
  const blurScene = new THREE.Scene()
  const blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const blurMaterial = new THREE.ShaderMaterial({
    ...GAUSSIAN_BLUR_SHADER,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
  const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial)
  blurQuad.frustumCulled = false
  blurScene.add(blurQuad)

  const diagnosticScene = debug ? new THREE.Scene() : null
  if (diagnosticScene) diagnosticScene.background = new THREE.Color(0x000000)
  const diagnosticCamera = debug
    ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    : null
  const diagnosticTextureMaterial = debug
    ? new THREE.ShaderMaterial({
      ...DEBUG_TEXTURE_SHADER,
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
    })
    : null
  const sourceValidityMaterial = debug
    ? new THREE.ShaderMaterial({
      ...SOURCE_VALIDITY_SHADER,
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
    })
    : null
  const diagnosticQuad = debug
    ? new THREE.Mesh(new THREE.PlaneGeometry(2, 2), diagnosticTextureMaterial)
    : null
  if (diagnosticQuad) {
    diagnosticQuad.frustumCulled = false
    diagnosticScene.add(diagnosticQuad)
  }

  reflector.name = 'StudioV2SoftFloorReflection'
  reflector.userData.studioV2Id = 'FLOOR_REFLECTION_SOURCE'
  reflector.matrixAutoUpdate = false
  reflector.matrix.copy(floor.matrix)
  reflector.matrixWorld.copy(floor.matrixWorld)
  reflector.castShadow = false
  reflector.receiveShadow = false
  reflector.visible = false

  const integratedUniforms = {
    studioReflectionTexture: { value: blurTargetB.texture },
    studioReflectionTexelSize: { value: new THREE.Vector2(1 / blurWidth, 1 / blurHeight) },
    studioReflectionEnabled: { value: enabled ? 1 : 0 },
    studioReflectionStrength: { value: 0.13 },
    studioReflectionF0: { value: 0.04 },
    studioFloorRoughness: { value: PHYSICAL_FLOOR.roughness },
    studioNormalDistortionTexels: { value: 1.5 },
    studioLowLuminanceContribution: { value: 0.52 },
    studioHighLuminanceContribution: { value: 1.08 },
    studioBasePolish: { value: 0 },
    studioLowerLuminanceThreshold: { value: 0.16 },
    studioUpperLuminanceThreshold: { value: 0.72 },
    studioFinalWeightClamp: { value: 0.28 },
    studioTwoLobeWeight: { value: 0 },
    studioReflectionWeightMask: { value: 0 },
    studioReflectionOnlyTest: { value: 0 },
  }

  const materialOnlyFloor = debug
    ? createPhysicalFloorMaterial(
      sourceFloorMaterial,
      'Material.002',
      STUDIO_V2_FLOOR_ARCHITECTURES.MATERIAL_ONLY,
    )
    : null
  const integratedFloor = createPhysicalFloorMaterial(
    sourceFloorMaterial,
    'Material.002',
    STUDIO_V2_FLOOR_ARCHITECTURES[STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE],
  )
  const reflectionOnlyTestFloor = debug
    ? createPhysicalFloorMaterial(
      sourceFloorMaterial,
      'StudioV2ReflectionOnlyTestFloor',
      STUDIO_V2_FLOOR_ARCHITECTURES[STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE],
      { neutral: true },
    )
    : null
  installIntegratedReflection(integratedFloor, integratedUniforms)
  if (reflectionOnlyTestFloor) installIntegratedReflection(reflectionOnlyTestFloor, integratedUniforms)

  const renderReflection = reflector.onBeforeRender
  const lastCameraMatrix = new THREE.Matrix4()
  const lastProjectionMatrix = new THREE.Matrix4()
  const updateTimes = []
  const blurUpdateTimes = []
  let hasRendered = false
  let blurReady = false
  let dirty = true
  let lastUpdateAt = -Infinity
  let updateCount = 0
  let blurUpdateCount = 0
  let skippedUpdateCount = 0
  let reflectionEnabled = Boolean(enabled)
  let activeCadence = 'STATIC'
  let activeCadenceHz = 0
  let coverageAudit = null
  let activeArchitecture = debug && architecture in STUDIO_V2_FLOOR_ARCHITECTURES
    ? architecture
    : STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE
  let activeDiagnosticMode = debug && diagnosticMode in STUDIO_V2_REFLECTION_DIAGNOSTIC_MODES
    ? diagnosticMode
    : 'FINAL_COMBINED'

  function architectureUsesIntegrated(candidate = activeArchitecture) {
    return STUDIO_V2_FLOOR_ARCHITECTURES[candidate]?.mode === 'INTEGRATED_OPAQUE'
  }

  function diagnosticsNeedSource(candidate = activeDiagnosticMode) {
    return [
      'RAW_SOURCE',
      'SOURCE_VALIDITY',
      'BLURRED_TARGET',
      'WEIGHT_MASK',
      'REFLECTION_ONLY_TEST',
    ].includes(candidate)
  }

  function sourceIsActive() {
    const profile = STUDIO_V2_FLOOR_ARCHITECTURES[activeArchitecture]
    return reflectionEnabled && (
      profile?.planarReflection
      || diagnosticsNeedSource()
    )
  }

  function applyIntegratedProfile(profile) {
    integratedFloor.roughness = profile.roughness
    integratedFloor.clearcoat = profile.clearcoat
    integratedFloor.clearcoatRoughness = profile.clearcoatRoughness
    integratedFloor.envMapIntensity = profile.envMapIntensity
    integratedUniforms.studioReflectionStrength.value = profile.reflectionStrength
    integratedUniforms.studioReflectionF0.value = profile.f0
    integratedUniforms.studioFloorRoughness.value = profile.roughness
    integratedUniforms.studioNormalDistortionTexels.value = profile.normalDistortionTexels
    integratedUniforms.studioLowLuminanceContribution.value = profile.lowLuminanceContribution
    integratedUniforms.studioHighLuminanceContribution.value = profile.highLuminanceContribution
    integratedUniforms.studioBasePolish.value = profile.basePolish
    integratedUniforms.studioLowerLuminanceThreshold.value = profile.lowerLuminanceThreshold
    integratedUniforms.studioUpperLuminanceThreshold.value = profile.upperLuminanceThreshold
    integratedUniforms.studioFinalWeightClamp.value = profile.finalWeightClamp
    integratedUniforms.studioTwoLobeWeight.value = profile.weightModel === 'TWO_LOBE' ? 1 : 0
  }

  function syncVisibleArchitecture() {
    const profile = STUDIO_V2_FLOOR_ARCHITECTURES[activeArchitecture]
    if (profile.mode === 'MATERIAL_ONLY_PHYSICAL') {
      floor.material = materialOnlyFloor ?? integratedFloor
      integratedUniforms.studioReflectionEnabled.value = 0
    } else {
      applyIntegratedProfile(profile)
      floor.material = integratedFloor
      integratedUniforms.studioReflectionEnabled.value = reflectionEnabled ? 1 : 0
    }
    floor.material.needsUpdate = true
    dirty = true
  }

  function applyArchitecture(nextArchitecture) {
    if (!debug && nextArchitecture !== STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE) return false
    if (!(nextArchitecture in STUDIO_V2_FLOOR_ARCHITECTURES)) return false
    activeArchitecture = nextArchitecture
    syncVisibleArchitecture()
    return true
  }

  function renderBlur(activeRenderer) {
    const previousTarget = activeRenderer.getRenderTarget()
    blurMaterial.uniforms.tDiffuse.value = reflectionTarget.texture
    blurMaterial.uniforms.direction.value.set(BLUR_SAMPLE_OFFSET / textureWidth, 0)
    activeRenderer.setRenderTarget(blurTargetA)
    activeRenderer.clear()
    activeRenderer.render(blurScene, blurCamera)

    blurMaterial.uniforms.tDiffuse.value = blurTargetA.texture
    blurMaterial.uniforms.direction.value.set(0, BLUR_SAMPLE_OFFSET / blurHeight)
    activeRenderer.setRenderTarget(blurTargetB)
    activeRenderer.clear()
    activeRenderer.render(blurScene, blurCamera)
    activeRenderer.setRenderTarget(previousTarget)

    blurReady = true
    blurUpdateCount += 1
    const now = performance.now()
    blurUpdateTimes.push(now)
    while (blurUpdateTimes.length > 1 && now - blurUpdateTimes[0] > 1000) {
      blurUpdateTimes.shift()
    }
  }

  function updateReflection(activeRenderer, activeScene, activeCamera) {
    const cameraMatrixDelta = hasRendered
      ? matrixDelta(activeCamera.matrixWorld, lastCameraMatrix)
      : Infinity
    const projectionMatrixDelta = hasRendered
      ? matrixDelta(activeCamera.projectionMatrix, lastProjectionMatrix)
      : Infinity
    const cameraChanged = !hasRendered
      || cameraMatrixDelta > 0.001
      || projectionMatrixDelta > 0.001
    if (!dirty && !cameraChanged) {
      activeCadence = 'STATIC'
      activeCadenceHz = 0
      skippedUpdateCount += 1
      return false
    }

    const now = performance.now()
    const requestedCadence = projectionMatrixDelta > 0.001 || cameraMatrixDelta > 0.008
      ? 'FAST'
      : cameraMatrixDelta > 0.0015
        ? 'ORBIT'
        : 'SLOW'
    const requestedCadenceHz = REFLECTION_UPDATE_RATES[requestedCadence]
    if (hasRendered && !dirty && now - lastUpdateAt < 1000 / requestedCadenceHz) {
      skippedUpdateCount += 1
      return false
    }

    const previousReflectorVisibility = reflector.visible
    const previousFloorVisibility = floor.visible
    const previousIntegratedEnabled = integratedUniforms.studioReflectionEnabled.value
    const previousBackground = activeScene.background
    const previousClearAlpha = activeRenderer.getClearAlpha()
    integratedUniforms.studioReflectionEnabled.value = 0
    floor.visible = false
    activeScene.background = null
    activeRenderer.setClearAlpha(0)
    reflector.matrix.copy(floor.matrix)
    reflector.matrixWorld.copy(floor.matrixWorld)
    try {
      renderReflection.call(reflector, activeRenderer, activeScene, activeCamera)
    } finally {
      floor.visible = previousFloorVisibility
      reflector.visible = previousReflectorVisibility
      integratedUniforms.studioReflectionEnabled.value = previousIntegratedEnabled
      activeScene.background = previousBackground
      activeRenderer.setClearAlpha(previousClearAlpha)
    }
    renderBlur(activeRenderer)
    lastCameraMatrix.copy(activeCamera.matrixWorld)
    lastProjectionMatrix.copy(activeCamera.projectionMatrix)
    lastUpdateAt = now
    updateCount += 1
    updateTimes.push(now)
    while (updateTimes.length > 1 && now - updateTimes[0] > 1000) updateTimes.shift()
    hasRendered = true
    dirty = false
    activeCadence = requestedCadence
    activeCadenceHz = requestedCadenceHz
    return true
  }

  function renderTextureDiagnostic(activeRenderer, texture) {
    if (!debug || !diagnosticTextureMaterial) return false
    diagnosticQuad.material = diagnosticTextureMaterial
    diagnosticTextureMaterial.uniforms.tDiffuse.value = texture
    activeRenderer.render(diagnosticScene, diagnosticCamera)
    return true
  }

  function renderSourceValidityDiagnostic(activeRenderer) {
    if (!debug || !sourceValidityMaterial) return false
    diagnosticQuad.material = sourceValidityMaterial
    sourceValidityMaterial.uniforms.tDiffuse.value = reflectionTarget.texture
    const bounds = coverageAudit?.projectedUv ?? { minU: 0, minV: 0, maxU: 1, maxV: 1 }
    sourceValidityMaterial.uniforms.projectedBounds.value.set(
      bounds.minU,
      bounds.minV,
      bounds.maxU,
      bounds.maxV,
    )
    activeRenderer.render(diagnosticScene, diagnosticCamera)
    return true
  }

  function renderWeightMask(activeRenderer, activeScene, activeCamera) {
    const visibility = []
    activeScene.traverse((object) => {
      if (!object.isMesh || object === floor) return
      visibility.push([object, object.visible])
      object.visible = false
    })
    const previousBackground = activeScene.background
    const previousMaterial = floor.material
    const previousReceiveShadow = floor.receiveShadow
    const previousMask = integratedUniforms.studioReflectionWeightMask.value
    const previousEnabled = integratedUniforms.studioReflectionEnabled.value
    floor.material = integratedFloor
    floor.receiveShadow = false
    activeScene.background = new THREE.Color(0x000000)
    integratedUniforms.studioReflectionEnabled.value = 1
    integratedUniforms.studioReflectionWeightMask.value = 1
    activeRenderer.render(activeScene, activeCamera)
    integratedUniforms.studioReflectionWeightMask.value = previousMask
    integratedUniforms.studioReflectionEnabled.value = previousEnabled
    activeScene.background = previousBackground
    floor.material = previousMaterial
    floor.receiveShadow = previousReceiveShadow
    visibility.forEach(([object, wasVisible]) => { object.visible = wasVisible })
  }

  function renderReflectionOnlyTest(activeRenderer, activeScene, activeCamera) {
    if (!debug || !reflectionOnlyTestFloor) return false
    const previousMaterial = floor.material
    const previousReceiveShadow = floor.receiveShadow
    const previousEnabled = integratedUniforms.studioReflectionEnabled.value
    const previousStrength = integratedUniforms.studioReflectionStrength.value
    const previousTest = integratedUniforms.studioReflectionOnlyTest.value
    floor.material = reflectionOnlyTestFloor
    floor.receiveShadow = false
    integratedUniforms.studioReflectionEnabled.value = 1
    integratedUniforms.studioReflectionStrength.value = 0.32
    integratedUniforms.studioReflectionOnlyTest.value = 1
    activeRenderer.render(activeScene, activeCamera)
    integratedUniforms.studioReflectionOnlyTest.value = previousTest
    integratedUniforms.studioReflectionStrength.value = previousStrength
    integratedUniforms.studioReflectionEnabled.value = previousEnabled
    floor.material = previousMaterial
    floor.receiveShadow = previousReceiveShadow
    return true
  }

  function runCoverageAudit(activeRenderer, activeScene, activeCamera) {
    if (!debug) return null
    const auditWidth = 320
    const auditHeight = 200
    const uvTarget = new THREE.WebGLRenderTarget(auditWidth, auditHeight, {
      depthBuffer: true,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
      samples: 0,
      stencilBuffer: false,
      type: THREE.FloatType,
    })
    const sourceTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight, {
      depthBuffer: false,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
      samples: 0,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
    })
    const auditMaterial = new THREE.ShaderMaterial({
      ...PROJECTED_UV_AUDIT_SHADER,
      depthFunc: THREE.LessEqualDepth,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    })
    const auditFloor = new THREE.Mesh(floor.geometry, auditMaterial)
    auditFloor.matrixAutoUpdate = false
    auditFloor.matrix.copy(floor.matrixWorld)
    const uvScene = new THREE.Scene()
    uvScene.add(auditFloor)
    const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const sourceMaterial = new THREE.ShaderMaterial({
      ...DEBUG_TEXTURE_SHADER,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    sourceMaterial.uniforms.tDiffuse.value = reflectionTarget.texture
    const sourceScene = new THREE.Scene()
    const sourceQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), sourceMaterial)
    sourceScene.add(sourceQuad)
    const sourceCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const previousTarget = activeRenderer.getRenderTarget()
    const previousOverride = activeScene.overrideMaterial
    const previousBackground = activeScene.background
    const previousAutoClear = activeRenderer.autoClear
    const previousClearColor = activeRenderer.getClearColor(new THREE.Color())
    const previousClearAlpha = activeRenderer.getClearAlpha()
    activeRenderer.setRenderTarget(uvTarget)
    activeRenderer.setClearColor(0x000000, 0)
    activeRenderer.clear(true, true, true)
    activeScene.overrideMaterial = blackMaterial
    activeScene.background = new THREE.Color(0x000000)
    activeRenderer.render(activeScene, activeCamera)
    activeScene.overrideMaterial = previousOverride
    activeRenderer.autoClear = false
    activeRenderer.render(uvScene, activeCamera)
    activeRenderer.autoClear = previousAutoClear
    activeScene.background = previousBackground
    const uvPixels = new Float32Array(auditWidth * auditHeight * 4)
    activeRenderer.readRenderTargetPixels(uvTarget, 0, 0, auditWidth, auditHeight, uvPixels)

    activeRenderer.setRenderTarget(sourceTarget)
    activeRenderer.clear(true, true, true)
    activeRenderer.render(sourceScene, sourceCamera)
    const sourcePixels = new Uint8Array(textureWidth * textureHeight * 4)
    activeRenderer.readRenderTargetPixels(sourceTarget, 0, 0, textureWidth, textureHeight, sourcePixels)
    activeRenderer.setRenderTarget(previousTarget)
    activeRenderer.setClearColor(previousClearColor, previousClearAlpha)

    let minU = Infinity
    let minV = Infinity
    let maxU = -Infinity
    let maxV = -Infinity
    let visibleFloorSamples = 0
    const sampledBins = new Set()
    for (let index = 0; index < uvPixels.length; index += 4) {
      if (uvPixels[index + 2] < 0.9) continue
      const u = uvPixels[index]
      const v = uvPixels[index + 1]
      minU = Math.min(minU, u)
      minV = Math.min(minV, v)
      maxU = Math.max(maxU, u)
      maxV = Math.max(maxV, v)
      visibleFloorSamples += 1
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const sourceX = Math.min(textureWidth - 1, Math.floor(u * textureWidth))
        const sourceY = Math.min(textureHeight - 1, Math.floor(v * textureHeight))
        sampledBins.add(sourceY * textureWidth + sourceX)
      }
    }

    let contentMinX = textureWidth
    let contentMinY = textureHeight
    let contentMaxX = -1
    let contentMaxY = -1
    for (let y = 0; y < textureHeight; y += 1) {
      for (let x = 0; x < textureWidth; x += 1) {
        const index = (y * textureWidth + x) * 4
        if (sourcePixels[index + 3] <= 2) continue
        contentMinX = Math.min(contentMinX, x)
        contentMinY = Math.min(contentMinY, y)
        contentMaxX = Math.max(contentMaxX, x)
        contentMaxY = Math.max(contentMaxY, y)
      }
    }
    const projectedUv = visibleFloorSamples > 0
      ? { minU, minV, maxU, maxV }
      : { minU: 0, minV: 0, maxU: 1, maxV: 1 }
    const clippedWidth = Math.max(0, Math.min(1, projectedUv.maxU) - Math.max(0, projectedUv.minU))
    const clippedHeight = Math.max(0, Math.min(1, projectedUv.maxV) - Math.max(0, projectedUv.minV))
    const contentBounds = contentMaxX >= 0
      ? {
        minU: contentMinX / textureWidth,
        minV: contentMinY / textureHeight,
        maxU: (contentMaxX + 1) / textureWidth,
        maxV: (contentMaxY + 1) / textureHeight,
      }
      : null
    const horizontalKernelUv = BLUR_SAMPLE_OFFSET * 4 / textureWidth
    const verticalKernelUv = BLUR_SAMPLE_OFFSET * 4 / blurHeight
    const crossesContentEdge = Boolean(contentBounds) && (
      projectedUv.minU - horizontalKernelUv < contentBounds.minU
      || projectedUv.maxU + horizontalKernelUv > contentBounds.maxU
      || projectedUv.minV - verticalKernelUv < contentBounds.minV
      || projectedUv.maxV + verticalKernelUv > contentBounds.maxV
    )
    coverageAudit = {
      blackRegionAffectsFinal: false,
      blurKernelCrossesInvalidBlack: crossesContentEdge,
      clampToEdge: reflectionTarget.texture.wrapS === THREE.ClampToEdgeWrapping
        && reflectionTarget.texture.wrapT === THREE.ClampToEdgeWrapping,
      contentBounds,
      projectedUv,
      projectedUvAreaPercent: Number((clippedWidth * clippedHeight * 100).toFixed(2)),
      sampledSourceBinsPercent: Number((sampledBins.size / (textureWidth * textureHeight) * 100).toFixed(2)),
      invalidBlackRejectedByAlphaMask: true,
      visibleFloorSamples,
    }

    uvTarget.dispose()
    sourceTarget.dispose()
    auditMaterial.dispose()
    blackMaterial.dispose()
    sourceMaterial.dispose()
    sourceQuad.geometry.dispose()
    return coverageAudit
  }

  function rateFor(times) {
    const now = performance.now()
    while (times.length > 1 && now - times[0] > 1000) times.shift()
    const windowMs = times.length > 1 ? times[times.length - 1] - times[0] : 0
    return windowMs > 0 ? (times.length - 1) * 1000 / windowMs : 0
  }

  applyArchitecture(activeArchitecture)
  reflector.onBeforeRender = function onBeforeRender(
    activeRenderer,
    activeScene,
    activeCamera,
  ) {
    updateReflection(activeRenderer, activeScene, activeCamera)
  }
  root.updateMatrixWorld(true)

  return {
    dispose() {
      floor.material = sourceFloorMaterial
      reflector.dispose()
      blurTargetA.dispose()
      blurTargetB.dispose()
      blurMaterial.dispose()
      blurQuad.geometry.dispose()
      diagnosticTextureMaterial?.dispose()
      sourceValidityMaterial?.dispose()
      diagnosticQuad?.geometry.dispose()
      materialOnlyFloor?.dispose()
      integratedFloor.dispose()
      reflectionOnlyTestFloor?.dispose()
    },
    getState() {
      const profile = STUDIO_V2_FLOOR_ARCHITECTURES[activeArchitecture]
      return {
        activeTargets: sourceIsActive() ? 3 : 0,
        allocatedTargets: 3,
        architecture: profile.mode,
        architectureCandidate: activeArchitecture,
        architectureLabel: profile.label,
        basePolish: profile.basePolish ?? 0,
        blurPasses: 2,
        blurReady,
        blurSampleOffset: BLUR_SAMPLE_OFFSET,
        blurSampleTapsPerPass: 9,
        blurTextureSize: [blurWidth, blurHeight],
        blurUpdateCount,
        blurUpdateRateHz: Number(rateFor(blurUpdateTimes).toFixed(1)),
        clearcoat: profile.clearcoat,
        clearcoatRoughness: profile.clearcoatRoughness,
        colourPipeline: 'LINEAR_HALF_FLOAT_SOURCE_AND_BLUR__OPAQUE_INTEGRATION__SINGLE_DISPLAY_OUTPUT',
        coverageAudit,
        diagnosticMode: activeDiagnosticMode,
        dprIndependent: true,
        enabled: reflectionEnabled,
        envMapIntensity: profile.envMapIntensity,
        f0: profile.f0 ?? null,
        finalWeightClamp: profile.finalWeightClamp ?? 0,
        highLuminanceContribution: profile.highLuminanceContribution ?? 0,
        initialRenderComplete: !sourceIsActive() || (hasRendered && blurReady),
        lowLuminanceContribution: profile.lowLuminanceContribution ?? 0,
        lowerLuminanceThreshold: profile.lowerLuminanceThreshold ?? 0,
        material: floor.material.name,
        maxUpdateRateHz: REFLECTION_UPDATE_RATES.FAST,
        metalness: profile.metalness,
        multisample: 0,
        normalDistortionTexels: profile.normalDistortionTexels ?? 0,
        productionOverlayAllocated: false,
        productionOverlayVisible: false,
        reflectionStrength: profile.reflectionStrength ?? 0,
        roughness: profile.roughness,
        skippedUpdateCount,
        sourceMaterial: FLOOR_MATERIAL_NAME,
        sourceMesh: floor.name,
        sourceTextureColorSpace: reflectionTarget.texture.colorSpace,
        sourceTextureType: reflectionTarget.texture.type,
        textureMemoryEstimateMiB: 1.88,
        textureSize: [textureWidth, textureHeight],
        toneMappedAtComposite: true,
        totalTargets: 3,
        updateCadence: activeCadence,
        updateCadenceHz: activeCadenceHz,
        updateCount,
        updateRateHz: Number(rateFor(updateTimes).toFixed(1)),
        updateStrategy: 'CAMERA_DELTA_ADAPTIVE__SOURCE_AND_BLUR_PAIRED__STATIC_ZERO',
        upperLuminanceThreshold: profile.upperLuminanceThreshold ?? 0,
        weightModel: profile.weightModel ?? 'NONE',
      }
    },
    markDirty() {
      dirty = true
    },
    reflector,
    runCoverageAudit(activeRenderer, activeScene, activeCamera) {
      return runCoverageAudit(activeRenderer, activeScene, activeCamera)
    },
    renderFrame(activeRenderer, activeScene, activeCamera) {
      if (sourceIsActive() && activeDiagnosticMode !== 'FINAL_COMBINED') {
        updateReflection(activeRenderer, activeScene, activeCamera)
      }

      if (activeDiagnosticMode === 'RAW_SOURCE') {
        renderTextureDiagnostic(activeRenderer, reflectionTarget.texture)
        return true
      }
      if (activeDiagnosticMode === 'SOURCE_VALIDITY') {
        renderSourceValidityDiagnostic(activeRenderer)
        return true
      }
      if (activeDiagnosticMode === 'BLURRED_TARGET') {
        renderTextureDiagnostic(activeRenderer, blurTargetB.texture)
        return true
      }
      if (activeDiagnosticMode === 'WEIGHT_MASK') {
        renderWeightMask(activeRenderer, activeScene, activeCamera)
        return true
      }
      if (activeDiagnosticMode === 'REFLECTION_ONLY_TEST') {
        renderReflectionOnlyTest(activeRenderer, activeScene, activeCamera)
        return true
      }
      if (activeDiagnosticMode === 'SHADOW_ONLY') {
        const previousIntegratedEnabled = integratedUniforms.studioReflectionEnabled.value
        integratedUniforms.studioReflectionEnabled.value = 0
        activeRenderer.render(activeScene, activeCamera)
        integratedUniforms.studioReflectionEnabled.value = previousIntegratedEnabled
        return true
      }

      if (architectureUsesIntegrated() && reflectionEnabled) {
        updateReflection(activeRenderer, activeScene, activeCamera)
      }
      activeRenderer.render(activeScene, activeCamera)
      return true
    },
    setArchitecture(nextArchitecture) {
      applyArchitecture(nextArchitecture)
      return this.getState()
    },
    setDiagnosticMode(nextDiagnosticMode) {
      if (!debug) return this.getState()
      if (!(nextDiagnosticMode in STUDIO_V2_REFLECTION_DIAGNOSTIC_MODES)) return this.getState()
      activeDiagnosticMode = nextDiagnosticMode
      syncVisibleArchitecture()
      return this.getState()
    },
    setEnabled(nextEnabled) {
      reflectionEnabled = Boolean(nextEnabled)
      syncVisibleArchitecture()
      return this.getState()
    },
  }
}
