import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export async function createStudioV2GltfLoader(renderer, deliveryConfig) {
  const loader = new GLTFLoader()
  let ktx2Loader = null
  let selectedGpuTextureFormat = 'SOURCE PNG/JPEG'

  if (deliveryConfig?.requiresMeshopt) {
    const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js')
    loader.setMeshoptDecoder(MeshoptDecoder)
  }

  if (deliveryConfig?.requiresKtx2) {
    const { KTX2Loader } = await import('three/addons/loaders/KTX2Loader.js')
    ktx2Loader = new KTX2Loader()
      .setTranscoderPath(`${import.meta.env.BASE_URL}basis/`)
      .detectSupport(renderer)
    loader.setKTX2Loader(ktx2Loader)
    selectedGpuTextureFormat = 'KTX2 / RUNTIME TRANSCODE — inspect renderer texture internals per device'
  }

  return {
    loader,
    selectedGpuTextureFormat,
    dispose() {
      ktx2Loader?.dispose()
    },
  }
}
