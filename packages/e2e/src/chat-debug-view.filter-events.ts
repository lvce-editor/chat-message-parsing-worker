import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'chat-network-worker.filter-events'

export const skip = 1

export const test: Test = async ({ Command, expect, Locator }) => {
  // arrange
  await Command.execute('Main.openUri', 'chat-network://e2e-session-filter')
  await expect(Locator('.chatNetwork')).toBeVisible()

  const events = [
    {
      sessionId: 'e2e-session-filter',
      timestamp: '2026-03-08T00:00:00.000Z',
      type: 'handle-submit',
      value: 'Alpha message',
    },
    {
      sessionId: 'e2e-session-filter',
      timestamp: '2026-03-08T00:00:01.000Z',
      type: 'handle-response',
      value: 'Beta response',
    },
    {
      sessionId: 'e2e-session-filter',
      target: 'Gamma button',
      timestamp: '2026-03-08T00:00:02.000Z',
      type: 'handle-click',
    },
  ]
  await Command.execute('chatNetWork.setEvents', events)
  const filterInput = Locator('.InputBox[name="filter"]')

  // act
  await filterInput.type('beta')

  // assert
  const eventNodes = Locator('.chatNetworkEvent')
  await expect(eventNodes).toHaveCount(1)
  await expect(eventNodes.nth(0)).toContainText('"value": "Beta response"')
}
