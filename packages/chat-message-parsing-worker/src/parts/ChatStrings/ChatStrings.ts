import { i18nString } from '@lvce-editor/i18n'
import * as UiStrings from '../UiStrings/UiStrings.ts'

export const chatTitle = (): string => {
  return i18nString(UiStrings.Chat)
}

export const chats = (): string => {
  return i18nString(UiStrings.Chat)
}

export const newChat = (): string => {
  return i18nString(UiStrings.NewChat)
}

export const addProject = (): string => {
  return i18nString(UiStrings.AddProjectChat)
}

export const debug = (): string => {
  return i18nString(UiStrings.Debug)
}

export const backToChats = (): string => {
  return i18nString(UiStrings.BackToChats)
}

export const backToChatList = (): string => {
  return i18nString(UiStrings.BackToChatList)
}

export const settings = (): string => {
  return i18nString(UiStrings.Settings)
}

export const search = (): string => {
  return i18nString(UiStrings.Search)
}

export const searchModels = (): string => {
  return i18nString(UiStrings.SearchModels)
}

export const searchChats = (): string => {
  return i18nString(UiStrings.SearchChats)
}

export const login = (): string => {
  return i18nString(UiStrings.Login)
}

export const logout = (): string => {
  return i18nString(UiStrings.Logout)
}

export const loginToBackend = (): string => {
  return i18nString(UiStrings.LoginToBackend)
}

export const logoutFromBackend = (): string => {
  return i18nString(UiStrings.LogoutFromBackend)
}

export const loggingInToBackend = (): string => {
  return i18nString(UiStrings.LoggingInToBackend)
}

export const chatFocusMode = (): string => {
  return i18nString(UiStrings.SwitchToChatFocusMode)
}

export const normalChatMode = (): string => {
  return i18nString(UiStrings.SwitchToNormalChatMode)
}

export const closeChat = (): string => {
  return i18nString(UiStrings.CloseChat)
}

export const clickToOpenNewChat = (): string => {
  return i18nString(UiStrings.ClickTheAddButtonToOpenANewChat)
}

export const startConversation = (): string => {
  return i18nString(UiStrings.StartConversationByTypingBelow)
}

export const noMatchingModelsFound = (): string => {
  return i18nString(UiStrings.NoMatchingModelsFound)
}

export const you = (): string => {
  return i18nString(UiStrings.You)
}

export const assistant = (): string => {
  return i18nString(UiStrings.Assistant)
}

export const composePlaceholder = (): string => {
  return i18nString(UiStrings.ComposePlaceholder)
}

export const attachImageAsContext = (): string => {
  return i18nString(UiStrings.AttachImageAsContext)
}

export const imageCouldNotBeLoaded = (): string => {
  return i18nString(UiStrings.ImageCouldNotBeLoaded)
}

export const openRouterApiKeyPlaceholder = (): string => {
  return i18nString(UiStrings.OpenRouterApiKeyPlaceholder)
}

export const openApiApiKeyPlaceholder = (): string => {
  return i18nString(UiStrings.OpenApiApiKeyPlaceholder)
}

export const sendMessage = (): string => {
  return i18nString(UiStrings.SendMessage)
}

export const startVoiceDictation = (): string => {
  return i18nString(UiStrings.StartVoiceDictation)
}

export const addContext = (): string => {
  return i18nString(UiStrings.AddContext)
}

export const send = (): string => {
  return i18nString(UiStrings.Send)
}

export const save = (): string => {
  return i18nString(UiStrings.Save)
}

export const saving = (): string => {
  return i18nString(UiStrings.Saving)
}

export const working = (): string => {
  return i18nString(UiStrings.Working)
}

export const getOpenRouterApiKey = (): string => {
  return i18nString(UiStrings.GetApiKey)
}

export const getOpenApiApiKey = (): string => {
  return i18nString(UiStrings.GetApiKey)
}

export const deleteChatSession = (): string => {
  return i18nString(UiStrings.Archive)
}

export const defaultSessionTitle = (): string => {
  return i18nString(UiStrings.Chat1)
}

export const dummyChatA = (): string => {
  return i18nString(UiStrings.DummyChatA)
}

export const dummyChatB = (): string => {
  return i18nString(UiStrings.DummyChatB)
}

export const dummyChatC = (): string => {
  return i18nString(UiStrings.DummyChatC)
}

export const unknownViewMode = (): string => {
  return i18nString(UiStrings.UnknownViewMode)
}

export const newFile = (): string => {
  return i18nString(UiStrings.NewFile)
}

export const newFolder = (): string => {
  return i18nString(UiStrings.NewFolder)
}

export const openContainingFolder = (): string => {
  return i18nString(UiStrings.OpenContainingFolder)
}

export const openInIntegratedTerminal = (): string => {
  return i18nString(UiStrings.OpenInIntegratedTerminal)
}

export const cut = (): string => {
  return i18nString(UiStrings.Cut)
}

export const showIcons = (): string => {
  return i18nString(UiStrings.ShowIcon)
}

export const copy = (): string => {
  return i18nString(UiStrings.Copy)
}

export const paste = (): string => {
  return i18nString(UiStrings.Paste)
}

export const pasteConfirmation = (): string => {
  return i18nString(UiStrings.PasteConfirmation)
}

export const copyPath = (): string => {
  return i18nString(UiStrings.CopyPath)
}

export const copyAsE2eTest = (): string => {
  return i18nString(UiStrings.CopyAsE2eTest)
}

export const copyRelativePath = (): string => {
  return i18nString(UiStrings.CopyRelativePath)
}

export const rename = (): string => {
  return i18nString(UiStrings.Rename)
}
export const archive = (): string => {
  return i18nString(UiStrings.Archive)
}

export const deleteItem = (): string => {
  return i18nString(UiStrings.Delete)
}

export const deleteConfirmationSingle = (path: string): string => {
  return i18nString(UiStrings.DeleteConfirmationSingle, [path])
}

export const deleteConfirmationMultiple = (count: number): string => {
  return i18nString(UiStrings.DeleteConfirmationMultiple, [count.toString()])
}

export const refresh = (): string => {
  return i18nString(UiStrings.RefreshExplorer)
}

export const collapseAll = (): string => {
  return i18nString(UiStrings.CollapseAllFoldersInExplorer)
}

export const explorer = (): string => {
  return i18nString(UiStrings.Explorer)
}

export const filesExplorer = (): string => {
  return i18nString(UiStrings.FilesExplorer)
}

export const youHaveNotYetOpenedAFolder = (): string => {
  return i18nString(UiStrings.YouHaveNotYetOpenedAFolder)
}

export const openFolder = (): string => {
  return i18nString(UiStrings.OpenFolder)
}

export const noFolderOpen = (): string => {
  return i18nString(UiStrings.NoFolderOpen)
}

export const fileOrFolderNameMustBeProvided = (): string => {
  return i18nString(UiStrings.FileOrFolderNameMustBeProvider)
}

export const fileCannotStartWithSlash = (): string => {
  return i18nString(UiStrings.FileNameCannotStartWithSlash)
}

export const fileCannotStartWithDot = (): string => {
  return i18nString(UiStrings.FileCannotStartWithDot)
}

export const fileCannotStartWithBackSlash = (): string => {
  return i18nString(UiStrings.FileCannotStartWithBackSlash)
}

export const typeAFileName = (): string => {
  return i18nString(UiStrings.TypeAFileName)
}

export const fileNameCannotStartWithSlash = (): string => {
  return i18nString(UiStrings.FileNameCannotStartWithSlash)
}

export const fileOrFolderAlreadyExists = (name: string): string => {
  return i18nString(UiStrings.FileOrFolderAlreadyExists, {
    PH1: name,
  })
}

export const theNameIsNotValid = (): string => {
  return i18nString(UiStrings.TheNameIsNotValid)
}

export const leadingOrTrailingWhitespaceDetected = (): string => {
  return i18nString(UiStrings.LeadingOrTrailingWhitespaceDetected)
}

export const openApiApiKeyRequiredMessage = i18nString(UiStrings.OpenApiApiKeyRequiredMessage)

export const openApiRequestFailedMessage = i18nString(UiStrings.OpenApiRequestFailedMessage)

export const openApiRequestFailedOfflineMessage = i18nString(UiStrings.OpenApiRequestFailedOfflineMessage)

export const openRouterApiKeyRequiredMessage = i18nString(UiStrings.OpenRouterApiKeyRequiredMessage)

export const openRouterRequestFailedMessage = i18nString(UiStrings.OpenRouterRequestFailedMessage)

export const openRouterTooManyRequestsMessage = i18nString(UiStrings.OpenRouterTooManyRequestsMessage)

export const openRouterRequestFailureReasons = [
  i18nString(UiStrings.OpenRouterRequestFailureReasonContentSecurityPolicyViolation),
  i18nString(UiStrings.OpenRouterRequestFailureReasonServerOffline),
  i18nString(UiStrings.CheckYourInternetConnection),
] as const

export const openRouterTooManyRequestsReasons = [
  i18nString(UiStrings.WaitAShortTimeAndRetryYourRequest),
  i18nString(UiStrings.ReduceRequestFrequencyToAvoidRateLimits),
  i18nString(UiStrings.UseADifferentModelIfThisOneIsSaturated),
] as const

export const backendUrlRequiredMessage = i18nString(UiStrings.BackendUrlRequiredMessage)

export const backendAccessTokenRequiredMessage = i18nString(UiStrings.BackendAccessTokenRequiredMessage)

export const backendCompletionFailedMessage = i18nString(UiStrings.BackendCompletionFailedMessage)
