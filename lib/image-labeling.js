import { viaTag } from 'es6://node_modules/@tonioloewald/b8r/lib/scripts.js'

const init = async () => {
  await viaTag('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.5.0/dist/tf.min.js')
  await viaTag('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd')
  await viaTag('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.0.4')
  const cocoPromise = cocoSsd.load()
  const mobilenetPromise = mobilenet.load()
  const [cocoModel, mobileModel] = await Promise.all([cocoPromise, mobilenetPromise])
  return {cocoModel, mobileModel}
}

const labels = (tags, objects) => {
  const labels = []
  tags.forEach(tag => {
    if (labels.indexOf(tag.className) === -1) labels.push(tag.className)
  })
  objects.forEach(obj => {
    if (labels.indexOf(obj.class) === -1) labels.push(obj.class)
  })
  return labels
}

let _processImage = async (image) => {
  const {cocoModel, mobileModel} = await init()
  const tags = await mobileModel.classify(image)
  const objects = await cocoModel.detect(image)
  return labels(tags, objects)
}

(async () => {
  const {cocoModel, mobileModel} = await init()
  _processImage = async (image) => {
    const tags = await mobileModel.classify(image)
    const objects = await cocoModel.detect(image)
    return labels(tags, objects)
  }
})()

export const processImage = async (image) => _processImage(image)
