import { expect, test } from 'vitest'
import { exportVideo, isVideoExportSupported } from './video'
import { buildDesign } from '../design/build'
import '../archetypes/index'

test('isVideoExportSupported returns a boolean', () => {
  expect(typeof isVideoExportSupported()).toBe('boolean')
})

test('exportVideo resolves without throwing when svg is null', async () => {
  await expect(exportVideo(null, buildDesign('mega-word', '4:5', 0), 'rise')).resolves.toBeUndefined()
})
